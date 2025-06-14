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
    name: 'jail',
    description: 'Jail a user',
    options: [
      {
        name: 'user',
        description: 'The user to jail',
        type: 6,
        required: true,
      },
      {
        name: 'reason',
        description: 'The reason for the jail',
        required: true,
        type: 3,
        max_length: 76,
      },
    ],
    access_control: 'MOD_AND_ABOVE',
    execute: async (interaction) => {
      try {
        // [Fetch suspect]
        const suspectID = interaction.options.get('user')?.value as string;
        var suspect = interaction.guild?.members.cache.get(suspectID);
        const reason = interaction.options.get('reason')?.value as string;
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
        const channels = getChannels(['jail', 'staff-log'])
        const jailRole = getRole('Jail', interaction);
        if (!channels) {
          await interaction.reply({
            content: `At least one channel is missing: jail, staff-log`,
            flags: ['Ephemeral']
          })
          return;
        }

        if (!jailRole) {
          await interaction.reply({
            content: `Jail role not found`,
            flags: ['Ephemeral']
          })
          return;
        }

        // [Check if has unverified role]
        if (suspect.roles.cache.has(getRole('Unverified', interaction)?.id || '')) {
          await interaction.reply({
            content: `User "<@${suspectID}>" is currently in verification. To move them out, use \`/verify\`.`,
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

        // [Jail the user]
        try {
          await suspect.roles.add(jailRole);
        } catch (error) {
          await interaction.reply({
            content: `Failed to jail user "<@${suspectID}>" (permission/role error).`,
            flags: ['Ephemeral']
          });
          return;
        }

        // [Send alerts]
        if (!reason?.includes('!testing')) {
          await channels["jail"].send({
            content: `<@${suspect.user.id}> **You have been jailed.** Please wait for a moderator to review the incident.`,
            embeds: [
              new EmbedBuilder()
                .setDescription(reason || 'No reason provided')
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
                  name: `${suspect.user.username} was jailed`,
                  iconURL: suspect.displayAvatarURL(),
                })
                .setDescription(reason || 'No reason provided')
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
        }
        // [Move user out of VC, if they were in one]
        if (suspect.voice.channel) {
          const jailVcChannel = getChannel('Jail VC', 'voice', interaction);
          if (jailVcChannel) {
            await suspect.voice.setChannel(jailVcChannel, 'Automoved (jail)');
          }
        }
        // [Reply]
        await interaction.reply({
          content: `✅ Jailed <@${suspectID}>.`,
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
