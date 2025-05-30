import { EmbedBuilder } from "discord.js";
import { WEventListener } from "../types/w-event-listener";
import { getChannel } from "../utils/discord/get-channel";
import { logError } from "../utils/log-error";
import { stringifyName } from "../utils/discord/stringify-name";
import { DateUtils } from "../utils/date-utils";
import { stringifyRoles } from "../utils/discord/stringify-roles";
import { syncMember } from "../utils/discord/sync-member";

export default function listener(): WEventListener {
    return {
        name: "guildMemberRemove",
        handler: async (member) => {
            console.log(`Member "${member.user.username} (${member.user.displayName})" left ${member.guild.name} (${member.guild.id}). Members: ${member.guild.memberCount}.`)

            try {
                // [Staff log]
                const staffLog = getChannel('staff-log', 'text', member);
                if (!staffLog) {
                    console.warn(`Staff log channel not found`);
                    return;
                }

                // [Send alert]
                await staffLog.send({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({
                                name: `${member.user.username} has left`,
                                iconURL: member.displayAvatarURL(),
                            })
                            .addFields(
                                {
                                    name: 'User',
                                    value: stringifyName(member),
                                },
                                {
                                    name: 'Roles',
                                    value: stringifyRoles(member),
                                },
                                {
                                    name: 'Joined Server',
                                    value:
                                        DateUtils.distanceFromNow(member.joinedTimestamp),
                                },
                                {
                                    name: 'Account Created',
                                    value:
                                        DateUtils.distanceFromNow(member.user.createdTimestamp),
                                },
                            )
                            .setFooter({
                                text: `Member count: ${member.guild.memberCount}`,
                            })
                            .setThumbnail(member.displayAvatarURL())
                            .setColor('DarkRed')
                            .setTimestamp(Date.now()),
                    ],
                });

                // [Sync member to DB]
                await syncMember(member);

            } catch (error) {
                logError(error, 'guildMemberRemove');
            }
        },
    };
}