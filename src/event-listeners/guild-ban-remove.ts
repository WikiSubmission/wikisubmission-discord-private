import { EmbedBuilder } from "discord.js";
import { WEventListener } from "../types/w-event-listener";
import { getChannel } from "../utils/discord/get-channel";
import { stringifyName } from "../utils/discord/stringify-name";
import { logError } from "../utils/log-error";
import { stimulateDelay } from "../utils/stimulate-delay";

export default function listener(): WEventListener {
    return {
        name: "guildBanRemove",
        handler: async (unban) => {
            console.log(`Member "${unban.user.username} (${unban.user.displayName})" unbanned from ${unban.guild.name} (${unban.guild.id}).`)

            try {
                // [Delay for audit log]
                await stimulateDelay(1000);

                // [Fetch audit log]
                const auditLogs = await unban.guild.fetchAuditLogs({
                    type: 22,
                    limit: 30,
                });

                const banLog = auditLogs.entries.find(
                    (e) => e.target?.id === unban.user.id,
                );

                // [Send alert]
                const staffLog = getChannel('staff-log', 'text', unban);
                if (!staffLog) {
                    console.warn(`Staff log channel not found`);
                    return;
                }
                await staffLog.send({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({
                                name: `${unban.user.username} unbanned`,
                                iconURL: unban.user.displayAvatarURL(),
                            })
                            .setDescription(unban.reason || banLog?.reason || '')
                            .addFields(
                                {
                                    name: 'User',
                                    value: stringifyName(unban.user),
                                },
                                {
                                    name: 'ID',
                                    value: `\`${unban.user.id}\``,
                                },
                            )
                            .setThumbnail(unban.user.displayAvatarURL() || null)
                            .setFooter({
                                text: banLog?.executor?.displayName || 'User Unban',
                                iconURL: banLog?.executor
                                    ? banLog.executor.displayAvatarURL()
                                    : undefined,
                            })
                            .setTimestamp(Date.now())
                            .setColor('DarkRed'),
                    ],
                })
            } catch (error) {
                logError(error, __filename)
            }
        },
    };
}