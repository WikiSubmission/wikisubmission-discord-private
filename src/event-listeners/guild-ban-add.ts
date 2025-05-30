import { EmbedBuilder } from "discord.js";
import { WEventListener } from "../types/w-event-listener";
import { getChannel } from "../utils/discord/get-channel";
import { logError } from "../utils/log-error";
import { stimulateDelay } from "../utils/stimulate-delay";
import { stringifyName } from "../utils/discord/stringify-name";

export default function listener(): WEventListener {
    return {
        name: "guildBanAdd",
        handler: async (ban) => {
            console.log(`Member "${ban.user.username} (${ban.user.displayName})" banned from ${ban.guild.name} (${ban.guild.id}).`)

            try {
                // [Delay for audit log]
                await stimulateDelay(1000);

                // [Fetch audit log]
                const auditLogs = await ban.guild.fetchAuditLogs({
                    type: 22,
                    limit: 30,
                });

                const banLog = auditLogs.entries.find(
                    (e) => e.target?.id === ban.user.id,
                );

                // [Send alert]
                const staffLog = getChannel('staff-log', 'text', ban);
                if (!staffLog) {
                    console.warn(`Staff log channel not found`);
                    return;
                }
                await staffLog.send({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({
                                name: `${ban.user.username} was banned`,
                                iconURL: ban.user.displayAvatarURL(),
                            })
                            .setDescription(ban.reason || banLog?.reason || '')
                            .addFields(
                                {
                                    name: 'User',
                                    value: stringifyName(ban.user),
                                },
                                {
                                    name: 'ID',
                                    value: `\`${ban.user.id}\``,
                                },
                            )
                            .setThumbnail(ban.user.displayAvatarURL() || null)
                            .setFooter({
                                text: banLog?.executor?.displayName || 'User Ban',
                                iconURL: banLog?.executor
                                    ? banLog.executor.displayAvatarURL()
                                    : undefined,
                            })
                            .setTimestamp(Date.now())
                            .setColor('DarkRed'),
                    ],
                })
            } catch (error) {
                logError(error, 'guildBanAdd')
            }
        },
    };
}