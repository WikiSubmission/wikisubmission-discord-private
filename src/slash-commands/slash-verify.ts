import { EmbedBuilder } from 'discord.js';
import { WSlashCommand } from '../types/w-slash-command';
import { getChannels } from '../utils/discord/get-channel';
import { getRole } from '../utils/discord/get-role';
import { logError } from '../utils/log-error';

export default function Command(): WSlashCommand {
  return {
    name: 'verify',
    description: 'Verify a user',
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
            content: `Verified role not found`,
            flags: ['Ephemeral']
          })
          return;
        }

        // [Check if already verified]
        if (!suspect.roles.cache.has(unverifiedRole.id)) {
          await interaction.reply({
            content: `User "<@${suspectID}>" is already verified. To move them to verification, use \`/interrogate\`.`,
            flags: ['Ephemeral']
          });
          return;
        }

        // [Verify the user]
        try {
          await suspect.roles.remove(unverifiedRole);
          const verifiedRole = getRole('Verified', interaction);
          if (verifiedRole) {
            await suspect.roles.add(verifiedRole);
          }
        } catch (error) {
          await interaction.reply({
            content: `Failed to verify user "<@${suspectID}>" (permission/role error).`,
            flags: ['Ephemeral']
          });
          return;
        }

        // [Send alerts]
        await channels["verify"].send({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: `${suspect.user.username} verified`,
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
                name: `${suspect.user.username} verified`,
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

        // [Reply]
        await interaction.reply({
          content: `✅ Verified <@${suspectID}>.`,
          flags: ['Ephemeral']
        });
      } catch (error) {
        await interaction.reply({
          content: `\`Internal Server Error\``,
          flags: ['Ephemeral']
        });
        logError(error, __filename);
      }
    },
  };
}
