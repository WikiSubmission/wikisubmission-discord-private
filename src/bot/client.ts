import {
  Awaitable,
  Client,
  ClientEvents,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
} from 'discord.js'
import { WEventListener } from '../types/w-event-listener'
import { WSlashCommand } from '../types/w-slash-command'
import { ScheduledTaskManager } from '../utils/discord/create-scheduled-action'
import { authenticateMember } from '../utils/discord/authenticate-member'
import { getCliParams } from '../utils/get-cli-params'
import { parseInteraction } from '../utils/discord/parse-interaction'
import { getEnv } from '../utils/get-env'
import { getFileExports } from '../utils/get-file-exports'
import { logError } from '../utils/log-error'
import { WUserCommand } from '../types/w-user-command'
import { WMessageCommand } from '../types/w-message-command'

export class Bot {
  static instance = new Bot()

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
      GatewayIntentBits.GuildModeration,
    ],
    rest: {
      timeout: 50_000,
    },
    // [Define presence]
    presence: {
      status: 'online',
      activities: [
        {
          name: 'The Submission Server',
          type: 3,
        },
      ],
    },
  })

  async start() {
    // [Get credentials first]
    const { token } =
      process.env.NODE_ENV === 'production'
        ? await this.getCredentials()
        : { token: process.env.BOT_TOKEN }

    // [Set up ready event BEFORE logging in]
    Bot.client.once(Events.ClientReady, async () => {
      console.log(
        `Online as "${Bot.client.user?.username}". In ${Bot.client.guilds.cache.size} guilds.`
      )
      Bot.client.guilds.cache.forEach((guild) => {
        console.log(`- ${guild.name} (${guild.id})`)
      })

      // [Now register everything after ready]
      await this.registerAppCommands()
      await this.registerEventListeners()
      await this.registerScheduledTasks()
      await this.listenForSlashCommands()
    })

    // [Set up error handlers]
    Bot.client.on('error', console.error)
    Bot.client.on('shardError', console.error)
    Bot.client.on('warn', console.warn)

    // [Login last]
    await Bot.client.login(token)
    const registered = await Bot.client.application?.commands.fetch()
    console.log(registered?.map((c) => `${c.name} (${c.type})`))
  }

  async getCredentials(): Promise<{
    token: string
    clientId: string
  }> {
    // [Default to .env file]
    if (process.env.BOT_TOKEN && process.env.BOT_CLIENT_ID) {
      return {
        token: process.env.BOT_TOKEN,
        clientId: process.env.BOT_CLIENT_ID,
      }
    }
    // [Fetch keys from cloud - for WikiSubmission]
    return {
      token: await getEnv(
        process.env.NODE_ENV === 'production'
          ? 'DISCORD_TOKEN_SUBMISSIONMOD'
          : 'DISCORD_TOKEN_SUBMISSIONMOD_DEVELOPMENT'
      ),
      clientId: await getEnv(
        process.env.NODE_ENV === 'production'
          ? 'DISCORD_CLIENTID_SUBMISSIONMOD'
          : 'DISCORD_CLIENTID_SUBMISSIONMOD_DEVELOPMENT'
      ),
    }
  }

  async addEventListener<Event extends keyof ClientEvents>(
    event: Event,
    listener: (...args: ClientEvents[Event]) => Awaitable<void>,
    once?: boolean
  ) {
    Bot.client[once ? 'once' : 'on'](event, async (...args: ClientEvents[Event]) => {
      try {
        await listener(...args)
      } catch (error) {
        logError(error, `${event}`)
      }
    })
  }

  async registerAppCommands() {
    // [Get slash command data from files]
    const slashCommands = await getFileExports<WSlashCommand>('/slash-commands')
    const userCommands = await getFileExports<WUserCommand>('/user-commands')
    const messageCommands = await getFileExports<WMessageCommand>('/message-commands')

    const allCommands = [
      ...slashCommands.map((s) => ({
        ...s,
        type: 1,
      })),
      ...userCommands,
      ...messageCommands,
    ]

    if (!allCommands || allCommands.length === 0) {
      console.log(`No commands found`)
      return
    }

    // [Get CLI params to consider manually skipping registration]
    const cliParams = getCliParams()
    if (cliParams.includes('ncs') || cliParams.includes('no-command-sync')) {
      console.warn(`Skipping command sync (as requested)`)
      return
    }

    // [Get credemtials]
    const { token, clientId } = await this.getCredentials()

    // [Get rest instance]
    const rest = new REST().setToken(token)

    // [Attempt to register slash commands]
    try {
      await rest.put(Routes.applicationCommands(clientId), {
        body: allCommands,
      })
      console.log(`Slash commands Synced: ${slashCommands.map((c) => `/${c.name}`).join(', ')}`)
      console.log(`User commands Synced: ${userCommands.map((c) => `/${c.name}`).join(', ')}`)
      console.log(`Message commands Synced: ${messageCommands.map((c) => `/${c.name}`).join(', ')}`)
    } catch (error) {
      logError(error, 'registerAppCommands')
    }
  }

  async registerEventListeners() {
    // [Get event listener data from files]
    const eventListeners = await getFileExports<WEventListener>('/event-listeners')

    if (!eventListeners || eventListeners.length === 0) {
      console.log(`No event handlers found`)
      return
    }

    // [Add event listeners]
    for (const eventListener of eventListeners) {
      this.addEventListener(
        eventListener.name,
        async (...args) => {
          try {
            // @ts-ignore
            await eventListener.handler(...args)
          } catch (error) {
            logError(error, eventListener.name)
          }
        },
        eventListener.once ? true : false
      )
    }

    console.log(`Listening for events: ${eventListeners.map((e) => e.name).join(', ')}`)
  }

  async registerScheduledTasks(): Promise<void> {
    // [Get scheduled tasks data from files]
    const scheduledActions = await getFileExports<ScheduledTaskManager>('/scheduled-tasks')

    if (!scheduledActions || scheduledActions.length === 0) {
      console.log(`No scheduled tasks found`)
      return
    }

    console.log(`Scheduled tasks: ${scheduledActions.map((s) => s.action.id).join(', ')}`)
  }

  async listenForSlashCommands() {
    const slashCommands = await getFileExports<WSlashCommand>('/slash-commands')
    const userCommands = await getFileExports<WUserCommand>('/user-commands')
    const messageCommands = await getFileExports<WMessageCommand>('/message-commands')
    // [Add event listener to listen for slash commands]
    this.addEventListener('interactionCreate', async (interaction) => {
      const startTime = Date.now()

      // ---- SLASH COMMANDS ----
      if (interaction.isChatInputCommand()) {
        console.log(parseInteraction(interaction))

        for (const slashCommand of slashCommands) {
          if (interaction.commandName === slashCommand.name) {
            try {
              // [Early return: DM use disabled]
              if (slashCommand.disabled_in_dm && !interaction.guild) {
                await interaction.reply({
                  content: '`This command has been disabled in DMs. Please try in a server.`',
                  flags: ['Ephemeral'],
                })
                return
              }

              // [Early return: unauthorized]
              if (
                slashCommand.access_control &&
                !authenticateMember(interaction.member, slashCommand.access_control)
              ) {
                await interaction.reply({
                  content: '`Unauthorized`',
                  flags: ['Ephemeral'],
                })
                return
              }

              // [Run handler]
              await slashCommand.execute(interaction)

              // [Record ping]
              const endTime = Date.now()
              console.log(
                `[${interaction.id}] /${interaction.commandName} completed in ${(endTime - startTime).toFixed(0)}ms`
              )
            } catch (error) {
              logError(error, `interactionCreate (/${interaction.commandName})`)
            }
          }
        }
      }

      // ---- USER CONTEXT MENU COMMANDS ----
      else if (interaction.isUserContextMenuCommand()) {
        console.log(
          `[${interaction.id}] User context menu command triggered: ${interaction.commandName}`
        )

        const cmd = userCommands.find((c) => c.name === interaction.commandName)
        if (!cmd) {
          console.warn(`[${interaction.id}] No matching user command found.`)
          return
        }

        try {
          await cmd.execute(interaction)
          const endTime = Date.now()
          console.log(
            `[${interaction.id}] User context command '${interaction.commandName}' completed in ${(endTime - startTime).toFixed(0)}ms`
          )
        } catch (error) {
          logError(error, `interactionCreate (User Context /${interaction.commandName})`)
        }
      }

      // ---- MESSAGE CONTEXT MENU COMMANDS ----
      else if (interaction.isMessageContextMenuCommand()) {
        console.log(
          `[${interaction.id}] Message context menu command triggered: ${interaction.commandName}`
        )

        const cmd = messageCommands.find((c) => c.name === interaction.commandName)
        if (!cmd) {
          console.warn(`[${interaction.id}] No matching message command found.`)
          return
        }

        try {
          await cmd.execute(interaction)
          const endTime = Date.now()
          console.log(
            `[${interaction.id}] Message context command '${interaction.commandName}' completed in ${(endTime - startTime).toFixed(0)}ms`
          )
        } catch (error) {
          logError(error, `interactionCreate (Message Context /${interaction.commandName})`)
        }
      }

      // ---- OTHER INTERACTIONS ----
      else {
        console.log(
          `[${interaction.id}] Unknown or unhandled interaction type: ${interaction.type}`
        )
      }
    })
  }
}
