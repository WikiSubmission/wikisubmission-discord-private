import { EmbedBuilder } from 'discord.js';
import { WEventListener } from '../types/w-event-listener';
import { SelectableRoles } from '../constants/selectable-roles';
import { getChannel } from '../utils/discord/get-channel';
import { stringifyName } from '../utils/discord/stringify-name';
import { logError } from '../utils/log-error';

export default function listener(): WEventListener {
  return {
    name: 'interactionCreate',
    handler: async (interaction) => {
      if (!interaction.guildId) return;
      if (!interaction.isButton()) return;
      if (interaction.customId !== 'clear_roles') return;
      const guild = interaction.client.guilds.cache.get(
        interaction.guildId,
      );
      if (!guild) return;
      const member = await guild.members.fetch(interaction.user.id);
      if (!member) return;

      const userRoleNames = member.roles.cache
        .filter((role) => role.name !== '@everyone')
        .map((role) => role.name);

      const choosableRoleNames = SelectableRoles.flatMap(
        (category) => category.roleNames,
      );

      const rolesNamesToRemove = choosableRoleNames.filter((roleName) =>
        userRoleNames.includes(roleName),
      );

      const rolesToRemove = guild.roles.cache.filter((i) =>
        rolesNamesToRemove.includes(i.name),
      );

      if (rolesToRemove && rolesToRemove.size > 0) {
        try {
          await member.roles.remove(rolesToRemove, 'Self cleared roles');
          await interaction.reply({
            content: `\`Success\` – cleared role${rolesToRemove.size > 1 ? 's' : ''
              } "${rolesToRemove.map((i) => `<@&${i.id}>`).join(', ')}"`,
            flags: ['Ephemeral'],
          });
          const STAFF_LOG_CHANNEL = getChannel('staff-log', 'text', interaction);
          if (!STAFF_LOG_CHANNEL) {
            console.warn('Staff-log channel not found');
            return;
          }
          await STAFF_LOG_CHANNEL.send({
            embeds: [
              new EmbedBuilder()
                .setAuthor({
                  name: `${member.displayName} cleared their roles`,
                  iconURL: member.displayAvatarURL(),
                })
                .setDescription(
                  `– ${rolesToRemove.map((i) => `${i}`).join(', ')}`,
                )
                .addFields({
                  name: 'User',
                  value: `${stringifyName(member)}`,
                })
                .setColor('DarkNavy')
                .setFooter({
                  text: 'Role Update',
                }),
            ],
          });
        } catch (error) {
          logError(error, __filename);
          await interaction.reply({
            content: '`You do not have any roles to clear`',
            flags: ['Ephemeral']
          });
        }
      } else {
        await interaction.reply({
          content: '`You do not have any roles to clear`',
          flags: ['Ephemeral'],
        });
      }
    },
  };
}
