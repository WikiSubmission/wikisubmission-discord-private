import { EmbedBuilder } from 'discord.js';
import { WSlashCommand } from '../types/w-slash-command';
import { DateUtils } from '../utils/date-utils';
import { stringifyName } from '../utils/discord/stringify-name';
import { getRole } from '../utils/discord/get-role';
import { getChannel, getChannels } from '../utils/discord/get-channel';
import { logError } from '../utils/log-error';
import { authenticateMember } from '../utils/discord/authenticate-member';

export default function Command(): WSlashCommand {
    return {
        name: 'interrogate',
        description: 'Require verification from a user',
        options: [
            {
                name: 'user',
                description: 'The user to verify',
                type: 6,
                required: true,
            },
        ],
        access_control: 'MOD_AND_ABOVE',
        execute: async (interaction) => {
            try {
                // [Fetch suspect]
                const suspectID = interaction.options.get('user')?.value as string;
                var suspect = interaction.guild?.members.cache.get(suspectID);
                if (!suspectID || !suspect) {
                    suspect = await interaction.guild?.members.fetch(suspectID);
                    if (!suspect) {
                        await interaction.reply({
                            content: `User "<@${suspectID}>" not found`,
                            flags: ['Ephemeral']
                        });
                        return;
                    }
                }
                // [Fetch associated roles and channels]
                const channels = getChannels(['verify', 'staff-log'])
                const unverifiedRole = getRole('Unverified', interaction);

                if (!channels) {
                    await interaction.reply({
                        content: `At least one channel is missing: verify, staff-log`,
                        flags: ['Ephemeral']
                    })
                    return;
                }

                if (!unverifiedRole) {
                    await interaction.reply({
                        content: `Unverified role not found`,
                        flags: ['Ephemeral']
                    })
                    return;
                }

                // [Check if already pending verification]
                if (suspect.roles.cache.has(unverifiedRole.id)) {
                    await interaction.reply({
                        content: `User "<@${suspectID}>" was already sent to verification. To move them out, use \`/verify\`.`,
                        flags: ['Ephemeral']
                    });
                    return;
                }

                // [Check if has jail role]
                if (suspect.roles.cache.has(getRole('Jail', interaction)?.id || '')) {
                    await interaction.reply({
                        content: `User "<@${suspectID}>" is currently in jail. To move them out, use \`/unjail\`.`,
                        flags: ['Ephemeral']
                    });
                    return;
                }

                // [No friendly fire]
                if (authenticateMember(suspect, 'MOD_AND_ABOVE')) {
                    await interaction.reply({
                        content: `No friendly fire!`,
                        flags: ['Ephemeral']
                    });
                    return;
                }

                // [Move the user to verification]
                try {
                    await suspect.roles.add(unverifiedRole);
                } catch (error) {
                    await interaction.reply({
                        content: `Failed to interrogate user "<@${suspectID}>" (permission/role error).`,
                        flags: ['Ephemeral']
                    });
                    return;
                }

                // [Send alerts]
                await channels["verify"].send({
                    content: `<@${suspect.user.id}> **Please verify with a staff member to gain access to the server.**`,
                    embeds: [
                        new EmbedBuilder()
                            .addFields(
                                {
                                    name: 'User',
                                    value: stringifyName(suspect),
                                },
                                {
                                    name: 'Account Created',
                                    value:
                                        DateUtils.distanceFromNow(
                                            suspect.user.createdTimestamp,
                                        )
                                },
                                {
                                    name: 'Joined',
                                    value:
                                        DateUtils.distanceFromNow(
                                            suspect.joinedTimestamp,
                                        ),
                                }
                            )
                            .setFooter({
                                text: `${interaction.user.username}`,
                                iconURL: interaction.user.displayAvatarURL(),
                            })
                            .setTimestamp(Date.now())
                            .setThumbnail(suspect.displayAvatarURL())
                            .setColor('DarkRed'),
                    ],
                });
                await channels["staff-log"].send({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({
                                name: `${suspect.user.username} was sent to verification channel`,
                                iconURL: suspect.displayAvatarURL(),
                            })
                            .addFields(
                                {
                                    name: 'User',
                                    value:
                                        stringifyName(suspect),
                                },
                                {
                                    name: 'Account Created',
                                    value:
                                        DateUtils.distanceFromNow(
                                            suspect.user.createdTimestamp,
                                        ),
                                },
                                {
                                    name: 'Joined',
                                    value:
                                        DateUtils.distanceFromNow(
                                            suspect.joinedTimestamp,
                                        ),
                                }
                            )
                            .setFooter({
                                text: `${interaction.user.username}`,
                                iconURL: interaction.user.displayAvatarURL(),
                            })
                            .setThumbnail(suspect.displayAvatarURL())
                            .setTimestamp(Date.now())
                            .setColor('DarkButNotBlack'),
                    ],
                });
                // [Move user out of VC, if they were in one]
                if (suspect.voice.channel) {
                    const verifyVcChannel = getChannel('Verify VC', 'voice', interaction);
                    if (verifyVcChannel) {
                        await suspect.voice.setChannel(verifyVcChannel, 'Automoved (verification)');
                    }
                }
                // [Reply]
                await interaction.reply({
                    content: `✅ Unverified <@${suspectID}>. To add them back, use /verify command.`,
                    flags: ['Ephemeral']
                });
            } catch (error) {
                await interaction.reply({
                    content: `\`Internal Server Error\``,
                    flags: ['Ephemeral']
                });
                logError(error, __filename);
                return;
            }
        },
    };
}
