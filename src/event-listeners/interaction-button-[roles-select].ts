import { EmbedBuilder } from 'discord.js';
import { WEventListener } from '../types/w-event-listener';
import { SelectableRoles } from '../constants/selectable-roles';
import { logError } from '../utils/log-error';
import { getChannel } from '../utils/discord/get-channel';
import { stringifyName } from '../utils/discord/stringify-name';

export default function listener(): WEventListener {
    return {
        name: 'interactionCreate',
        handler: async (interaction) => {
            try {
                if (!interaction.guildId) return;
                if (!interaction.isStringSelectMenu()) return;
                if (interaction.customId !== 'role_update') return;
                if (interaction.values.length === 0) return;
                const guild = interaction.client.guilds.cache.get(
                    interaction.guildId,
                );
                if (!guild) return;
                const member = await guild.members.fetch(interaction.user.id);
                if (!member) return;

                const requestedRoles = interaction.values.map((value) => {
                    const [roleCategory, roleName] = value.split(':');
                    return { roleCategory, roleName };
                });

                var canAddRoles = false;
                requestedRoles.forEach((role) => {
                    if (
                        !member.roles.cache.find(
                            (i) => i.name.toLowerCase() === role.roleName.toLowerCase(),
                        )
                    ) {
                        canAddRoles = true;
                    }
                });

                if (!canAddRoles) {
                    await interaction.reply({
                        content: `\`Error\` - you already have role(s): "${requestedRoles.map((i) => i.roleName).join(', ')}"`,
                        flags: ['Ephemeral'],
                    });
                    return;
                }

                const addedRoles: string[] = [];
                const removedRoles: string[] = [];
                let errorMessage: string | null = null;

                for (const role of requestedRoles) {
                    const internalReferenceObject = SelectableRoles.find(
                        (c) => c.category === role.roleCategory,
                    );

                    const internalReferenceRoleName =
                        internalReferenceObject?.roleNames.find(
                            (i) => i.toLowerCase() === role.roleName.toLowerCase(),
                        );

                    if (internalReferenceRoleName && internalReferenceObject) {
                        const actualRoleId = guild.roles.cache.find(
                            (i) =>
                                i.name.toLowerCase() === internalReferenceRoleName.toLowerCase(),
                        );

                        if (actualRoleId) {
                            try {
                                // Add role.
                                await member.roles.add(actualRoleId, 'Choose Roles Selection');
                                addedRoles.push(actualRoleId.id);

                                // Remove any other roles in the same category, if applicable.
                                if (!internalReferenceObject?.allowMultiple) {
                                    const rolesNamesToRemove =
                                        internalReferenceObject?.roleNames.filter(
                                            (i) =>
                                                i.toLowerCase() !==
                                                internalReferenceRoleName.toLowerCase(),
                                        );
                                    if (rolesNamesToRemove) {
                                        const rolesToRemove = guild.roles.cache.filter((r) =>
                                            rolesNamesToRemove
                                                .map((i) => i.toLowerCase())
                                                .includes(r.name.toLowerCase()),
                                        );
                                        try {
                                            for (const [roleId, _] of rolesToRemove) {
                                                if (member.roles.cache.has(roleId)) {
                                                    await member.roles.remove(
                                                        rolesToRemove,
                                                        'Choose Roles Selection (Auto Removal)',
                                                    );
                                                    removedRoles.push(roleId);
                                                }
                                            }
                                        } catch (error) {
                                            logError(error, 'interaction-button-[roles-select]');
                                        }
                                    }
                                }
                            } catch (error) {
                                logError(error, 'interaction-button-[roles-select]');
                            }
                        }
                    } else {
                        errorMessage = `No role found for \`${role.roleName}\``;
                    }
                }

                if (errorMessage) {
                    await interaction.reply({
                        content: `\`Error\` – ${errorMessage}`,
                        flags: ['Ephemeral'],
                    });
                } else if (addedRoles.length > 0) {
                    await interaction.reply({
                        content: `\`Success\` – added ${addedRoles.map((id) => `<@&${id}>`).join(', ')} role${removedRoles.length > 0
                            ? ` (replacing: ${removedRoles
                                .map((i) => `<@&${i}>`)
                                .join(', ')})`
                            : ''
                            }`,
                        flags: ['Ephemeral'],
                    });

                    const staffLogChannel = getChannel('staff-log', 'text', interaction);
                    if (!staffLogChannel) {
                        console.warn(`Staff-log channel not found`);
                        return;
                    }
                    await staffLogChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setAuthor({
                                    name: `${member.displayName} updated their role`,
                                    iconURL: member.displayAvatarURL(),
                                })
                                .setDescription(
                                    `+ ${addedRoles.map((i) => `<@&${i}>`).join(', ')}`,
                                )
                                .addFields(
                                    ...(removedRoles.length > 0
                                        ? [
                                            {
                                                name: 'Replaced',
                                                value: `– ${removedRoles
                                                    .map((i) => `<@&${i}>`)
                                                    .join(', ')}`,
                                            },
                                        ]
                                        : []),
                                )
                                .addFields({
                                    name: 'User',
                                    value: `${stringifyName(member)}`,
                                })
                                .setColor('DarkNavy')
                                .setFooter({
                                    text: requestedRoles?.[0]?.roleCategory || 'Role Update',
                                }),
                        ],
                    });
                } else {
                    await interaction.reply({
                        content: `\`Error\` – no roles were added`,
                        flags: ['Ephemeral'],
                    });
                }
            } catch (error) {
                logError(error, __filename);
            }
        },
    };
}
