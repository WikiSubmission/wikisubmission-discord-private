import { BaseMessageOptions } from "discord.js";
import { WEventListener } from "../types/w-event-listener";
import { stimulateDelay } from "../utils/stimulate-delay";
import { authenticateMember } from "../utils/discord/authenticate-member";
import { SelectableRoles } from "../constants/selectable-roles";
import { getChannel } from "../utils/discord/get-channel";
import { logError } from "../utils/log-error";

export default function listener(): WEventListener {
    return {
        name: 'messageCreate',
        handler: async (message) => {
            try {
                if (message.content !== '!rolemenu') return;
                if (message.author.bot) return;
                if (!message.guild) return;
                if (!authenticateMember(message.member, 'ADMIN')) return;

                try {
                    await message.delete();
                } catch (error) {
                    console.warn(`Failed to delete !rolemenu call`);
                }

                const otherLanguageRoles = (() => {
                    const roles = SelectableRoles.filter(
                        (role) => role.category === 'Other Languages',
                    )[0]?.roleNames.map((roleName) => ({
                        label: roleName,
                        value: `Other Languages:${roleName}`,
                    }));

                    return roles;
                })();

                const reminderRoles = (() => {
                    const roles = SelectableRoles.filter(
                        (role) => role.category === 'Reminder Roles',
                    )[0]?.roleNames.map((roleName) => ({
                        label: roleName,
                        value: `Reminder Roles:${roleName}`,
                    }));

                    return roles;
                })();

                const CHOOSE_ROLES_CHANNEL = getChannel('choose-roles', 'text', message);
                if (!CHOOSE_ROLES_CHANNEL) {
                    console.warn(`Choose-roles channel not found.`);
                    return;
                }

                const payloads: BaseMessageOptions[] = [
                    {
                        content: `🙏 **Religion**`,
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 3,
                                        custom_id: `role_update`,
                                        options: SelectableRoles.filter(
                                            (role) => role.category === 'Religion',
                                        )[0]?.roleNames.map((roleName) => ({
                                            label: roleName,
                                            value: `Religion:${roleName}`,
                                        })),
                                    },
                                ],
                            },
                        ],
                    },

                    {
                        content: `🙋‍♂️ **Gender**`,
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 3,
                                        custom_id: `role_update`,
                                        options: SelectableRoles.filter(
                                            (role) => role.category === 'Gender',
                                        )[0]?.roleNames.map((roleName) => ({
                                            label: roleName,
                                            value: `Gender:${roleName}`,
                                        })),
                                    },
                                ],
                            },
                        ],
                    },

                    {
                        content: `🌎 **Region**`,
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 3,
                                        custom_id: `role_update`,
                                        options: SelectableRoles.filter(
                                            (role) => role.category === 'Region',
                                        )[0]?.roleNames.map((roleName) => ({
                                            label: roleName,
                                            value: `Region:${roleName}`,
                                            description: getRegionDescription(roleName) || undefined,
                                        })),
                                    },
                                ],
                            },
                        ],
                    },

                    {
                        content: `🕰️ **Age**`,
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 3,
                                        custom_id: `role_update`,
                                        options: SelectableRoles.filter(
                                            (role) => role.category === 'Age',
                                        )[0]?.roleNames.map((roleName) => ({
                                            label: roleName,
                                            value: `Age:${roleName}`,
                                        })),
                                    },
                                ],
                            },
                        ],
                    },

                    {
                        content: `💍 **Marital Status**`,
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 3,
                                        custom_id: `role_update`,
                                        options: SelectableRoles.filter(
                                            (role) => role.category === 'Marital Status',
                                        )[0]?.roleNames.map((roleName) => ({
                                            label: roleName,
                                            value: `Marital Status:${roleName}`,
                                        })),
                                    },
                                ],
                            },
                        ],
                    },

                    {
                        content: `🌐 **Other Languages**`,
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 3,
                                        custom_id: `role_update`,
                                        options: otherLanguageRoles,
                                        max_values: otherLanguageRoles.length,
                                    },
                                ],
                            },
                        ],
                    },

                    {
                        content: `⏰ **Reminder Roles**`,
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 3,
                                        custom_id: `role_update`,
                                        options: reminderRoles,
                                        max_values: reminderRoles.length,
                                    },
                                ],
                            },
                        ],
                    },

                    {
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        style: 1,
                                        custom_id: `view_roles`,
                                        label: 'View my roles',
                                    },
                                    {
                                        type: 2,
                                        style: 2,
                                        custom_id: `clear_roles`,
                                        label: 'Clear my roles',
                                    },
                                ],
                            },
                        ],
                    },
                ];

                for (const payload of payloads) {
                    await CHOOSE_ROLES_CHANNEL.send(payload);
                    await stimulateDelay(500);
                }

                function getRegionDescription(region: string): string | null {
                    switch (region) {
                        case 'United States':
                            return '🇺🇸 USA';
                        case 'Canada':
                            return '🇨🇦 Canada';
                        case 'South America':
                            return '🌎 South America';
                        case 'Europe':
                            return '🇪🇺 Europe';
                        case 'Africa':
                            return '🌍 Africa';
                        case 'Asia':
                            return '🌏 Asia';
                        case 'Middle East':
                            return '🕌 Middle East';
                        case 'Australia':
                            return '🇦🇺 Australia / New Zealand';
                        default:
                            return null;
                    }
                }
            } catch (error) {
                logError(error, __filename)
            }
        }
    }
}

