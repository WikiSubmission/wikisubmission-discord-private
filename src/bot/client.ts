import { Awaitable, Client, ClientEvents, GatewayIntentBits, REST, Routes } from 'discord.js'
import { WEventListener } from '../types/w-event-listener';
import { WSlashCommand } from '../types/w-slash-command';
import { ScheduledTaskManager } from '../utils/discord/create-scheduled-action';
import { authenticateMember } from '../utils/discord/authenticate-member';
import { getCliParams } from '../utils/get-cli-params';
import { parseInteraction } from '../utils/discord/parse-interaction';
import { getEnv } from "../utils/get-env";
import { getFileExports } from "../utils/get-file-exports";
import { logError } from '../utils/log-error';

export class Bot {
    static instance = new Bot();
    
    public static client = new Client({
        intents: [
            // [Non-privileged intents]
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildScheduledEvents,
            GatewayIntentBits.GuildVoiceStates,
            // [Privileged intents]
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildModeration
        ],
        // [Define presence]
        presence: {
            status: 'online',
            activities: [
                {
                    name: 'The Submission Server',
                    type: 3,
                },
            ],
        }
    })

    async start() {
        // [Login]
        const { token } = await this.getCredentials();
        await Bot.client.login(token);
        console.log(
            `Online as "${Bot.client.user?.username}". In ${Bot.client.guilds.cache.size} guilds.`,
        );

        // [Slash commands]
        await this.registerSlashCommands();
        await this.listenForSlashCommands();

        // [Event listeners]
        await this.registerEventListeners();

        // [Scheduled tasks]
        await this.registerScheduledTasks();
    }

    async getCredentials(): Promise<{
        token: string;
        clientId: string;
    }> {
        // [Default to .env file]
        if (process.env.BOT_TOKEN && process.env.BOT_CLIENT_ID) {
            return {
                token: process.env.BOT_TOKEN,
                clientId: process.env.BOT_CLIENT_ID
            }
        }
        // [Fetch keys from cloud - for WikiSubmission]
        return {
            token: await getEnv(
                process.env.NODE_ENV === 'production'
                    ? 'DISCORD_TOKEN_SUBMISSIONMOD'
                    : 'DISCORD_TOKEN_SUBMISSIONMOD_DEVELOPMENT',
            ),
            clientId: await getEnv(
                process.env.NODE_ENV === 'production'
                    ? 'DISCORD_CLIENTID_SUBMISSIONMOD'
                    : 'DISCORD_CLIENTID_SUBMISSIONMOD_DEVELOPMENT',
            ),
        }
    }

    async addEventListener<Event extends keyof ClientEvents>(
        event: Event,
        listener: (...args: ClientEvents[Event]) => Awaitable<void>,
        once?: boolean,
    ) {
        Bot.client[once ? 'once' : 'on'](
            event,
            async (...args: ClientEvents[Event]) => {
                try {
                    await listener(...args);
                } catch (error) {
                    logError(error, `${event}`);
                }
            },
        );
    }

    async registerSlashCommands() {
        // [Get slash command data from files]
        const slashCommands = await getFileExports<WSlashCommand>(
            '/slash-commands'
        );

        if (!slashCommands || slashCommands.length === 0) {
            console.log(`No slash commands found`);
            return;
        }

        // [Get CLI params to consider manually skipping registration]
        const cliParams = getCliParams();
        if (cliParams.includes('ncs') || cliParams.includes('no-command-sync')) {
            console.warn(`Skipping command sync (as requested)`);
            return;
        }

        // [Get credemtials]
        const { token, clientId } = await this.getCredentials();

        // [Get rest instance]
        const rest = new REST().setToken(token);

        // [Attempt to register slash commands]
        try {
            await rest.put(
                Routes.applicationCommands(
                    clientId,
                ),
                {
                    body: slashCommands
                }
            )
            console.log(
                `Commands Synced: ${slashCommands
                    .map((c) => `/${c.name}`)
                    .join(', ')}`
            )
        } catch (error) {
            logError(error, 'registerSlashCommands')
        }
    }

    async registerEventListeners() {
        // [Get event listener data from files]
        const eventListeners = await getFileExports<WEventListener>(
            '/event-listeners'
        );

        if (!eventListeners || eventListeners.length === 0) {
            console.log(`No event handlers found`);
            return;
        }

        // [Add event listeners]
        for (const eventListener of eventListeners) {
            this.addEventListener(
                eventListener.name,
                async (...args) => {
                    // @ts-ignore
                    await eventListener.handler(...args);
                },
                eventListener.once ? true : false,
            );
        }

        console.log(
            `Listening for events: ${eventListeners
                .map((e) => e.name)
                .join(', ')}`,
        );
    }

    async registerScheduledTasks(): Promise<void> {
        // [Get scheduled tasks data from files]
        const scheduledActions = await getFileExports<ScheduledTaskManager>(
            '/scheduled-tasks'
        );

        if (!scheduledActions || scheduledActions.length === 0) {
            console.log(`No scheduled tasks found`);
            return;
        }

        console.log(
            `Scheduled tasks: ${scheduledActions
                .map((s) => s.action.id)
                .join(', ')}`,
        );
    }

    async listenForSlashCommands() {
        const slashCommands = await getFileExports<WSlashCommand>(
            '/slash-commands'
        );

        // [Add event listener to listen for slash commands]
        this.addEventListener('interactionCreate', async (interaction) => {
            if (interaction.isCommand()) {
                // [Get start timestamp]
                const startTime = Date.now();

                // [Debug log]
                console.log(parseInteraction(interaction));

                // [Loop over each known command]
                for (const slashCommand of slashCommands) {

                    // [Find the matching command requested]
                    if (interaction.commandName === slashCommand.name) {
                        try {
                            // [Early return: DM use disabled]
                            if (slashCommand.disabled_in_dm && !interaction.guild) {
                                await interaction.reply({
                                    content:
                                        '`This command has been disabled in DMs. Please try in a server.`',
                                    flags: ['Ephemeral'],
                                });
                                return;
                            }

                            // [Early return: unauthorized]
                            if (
                                slashCommand.access_control &&
                                !authenticateMember(
                                    interaction.member,
                                    slashCommand.access_control,
                                )
                            ) {
                                await interaction.reply({
                                    content: '`Unauthorized`',
                                    flags: ['Ephemeral'],
                                });
                                return;
                            }

                            // [Run handler]
                            await slashCommand.execute(interaction);

                            // [Record ping]
                            const endTime = Date.now();
                            console.log(
                                `[${interaction.id}] completed in ${(
                                    endTime - startTime
                                ).toFixed(0)}ms`,
                            );
                        } catch (error) {
                            logError(error, `interactionCreate (/${interaction.commandName})`);
                        }
                    }
                }
            }
        });
    }
}