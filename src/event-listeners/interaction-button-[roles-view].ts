import { EmbedBuilder } from 'discord.js';
import { WEventListener } from '../types/w-event-listener';
import { stringifyName } from '../utils/discord/stringify-name';
import { stringifyRoles } from '../utils/discord/stringify-roles';

export default function listener(): WEventListener {
  return {
    name: 'interactionCreate',
    handler: async (interaction) => {
      if (!interaction.guildId) return;
      if (!interaction.member) return;
      if (!interaction.isButton()) return;
      if (interaction.customId === 'view_roles') {
        const guild = interaction.client.guilds.cache.find(
          (g) => g.id === interaction.guildId,
        );
        const member = await guild?.members.fetch(interaction.user.id);
        if (!member) return;
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('View Roles')
              .addFields(
                {
                  name: `User`,
                  value: stringifyName(member),
                },
                {
                  name: `Roles`,
                  value: stringifyRoles(member),
                },
              )
              .setThumbnail(member.displayAvatarURL())
              .setColor('DarkButNotBlack'),
          ],
          flags: ['Ephemeral'],
        });
      }
    },
  };
}
