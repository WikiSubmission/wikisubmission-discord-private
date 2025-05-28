import { EmbedBuilder } from 'discord.js';
import { WSlashCommand } from '../types/w-slash-command';
import { getChannels } from '../utils/discord/get-channel';
import { getRole } from '../utils/discord/get-role';
import { syncMember } from '../utils/discord/sync-member';
import { logError } from '../utils/log-error';

export default function Command(): WSlashCommand {
  return {
    name: 'unjail',
    description: 'Unjail a user',
    options: [
      {
        name: 'user',
        description: 'The user to unjail',
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
        const channels = getChannels(['jail', 'staff-log'])
        const jailRole = getRole('Jail', interaction);
        if (!channels) {
          await interaction.reply({
            content: `At least one channel is missing: jail, staff-log `,
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

        // [Unjail the user]
        try {
          await suspect.roles.remove(jailRole);
        } catch (error) {
          await interaction.reply({
            content: `Failed to unjail user "<@${suspectID}>" (permission/role error).`,
            flags: ['Ephemeral']
          });
          return;
        }

        // [Send alerts]
        await channels["jail"].send({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: `${suspect.user.username} released`,
                iconURL: suspect.displayAvatarURL(),
              })
              .setFooter({
                text: `${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
              .setColor('DarkGreen'),
          ],
        });

        await channels["staff-log"].send({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: `${suspect.user.username} released`,
                iconURL: suspect.displayAvatarURL(),
              })
              .setFooter({
                text: `${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setTimestamp(Date.now())
              .setColor('DarkGreen'),
          ],
        });

        // [Update DB]
        await syncMember(interaction.member as any);

        // [Reply]
        await interaction.reply({
          content: `✅ Unjailed <@${suspectID}>.`,
          flags: ['Ephemeral']
        });
      } catch (error) {
        await interaction.reply({
          content: `\`Internal Server Error\``,
          flags: ['Ephemeral']
        });
        logError(error, 'slash-unjail');
      }
    },
  };
}
