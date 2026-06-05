import { AuditLogEvent, EmbedBuilder } from "discord.js";
import { WEventListener } from "../types/w-event-listener";
import { getChannel } from "../utils/get-channel";
import { logError } from "../utils/log-error";
import { stringifyName } from "../utils/stringify-name";
import { DateUtils } from "../utils/date-utils";
import { stringifyRoles } from "../utils/stringify-roles";
import { syncMember } from "../utils/sync-member";
import { stimulateDelay } from "../utils/stimulate-delay";
import { recordModeration } from "../utils/record-moderation";
import { checkModeratorActivity } from "../utils/check-moderator-abuse";

export default function listener(): WEventListener {
  return {
    name: "guildMemberRemove",
    handler: async (member) => {
      console.log(
        `Member "${member.user.username} (${member.user.displayName})" left ${member.guild.name} (${member.guild.id}). Members: ${member.guild.memberCount}.`
      );

      try {
        // [Staff log]
        const staffLog = getChannel("staff-log", "text", member);
        if (!staffLog) {
          console.warn(`Staff log channel not found`);
          return;
        }

        // [Detect kick via audit log]
        // A kick fires the same guildMemberRemove event as a voluntary leave,
        // so we inspect the audit log to tell them apart. Bans produce a
        // separate MemberBanAdd entry (logged in guild-ban-add), so filtering
        // on MemberKick avoids double-reporting bans here.
        await stimulateDelay(1000);

        let kickLog: {
          reason: string | null;
          executorId?: string;
          executorName?: string;
        } | null = null;
        try {
          const auditLogs = await member.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberKick,
            limit: 10,
          });

          const entry = auditLogs.entries.find(
            (e) =>
              e.target?.id === member.user.id &&
              // Only treat as a kick if the audit entry was just created,
              // otherwise a stale entry from a previous kick could mislabel
              // a later voluntary leave.
              Date.now() - e.createdTimestamp < 5000
          );

          if (entry) {
            kickLog = {
              reason: entry.reason ?? null,
              executorId: entry.executor?.id,
              executorName: entry.executor?.displayName,
            };
          }
        } catch (auditError) {
          // Missing "View Audit Log" permission or a transient fetch failure
          // should not block the standard departure notice below.
          logError(auditError, __filename);
        }

        // [Send alert]
        if (kickLog) {
          await staffLog.send({
            embeds: [
              new EmbedBuilder()
                .setAuthor({
                  name: `${member.user.username} was kicked`,
                  iconURL: member.displayAvatarURL(),
                })
                .setDescription(kickLog.reason || null)
                .addFields(
                  {
                    name: "User",
                    value: stringifyName(member),
                  },
                  {
                    name: "Roles",
                    value: stringifyRoles(member),
                  },
                  {
                    name: "Joined Server",
                    value: DateUtils.distanceFromNow(member.joinedTimestamp),
                  },
                  {
                    name: "Account Created",
                    value: DateUtils.distanceFromNow(
                      member.user.createdTimestamp
                    ),
                  }
                )
                .setFooter({
                  text: kickLog.executorName
                    ? `Kicked by ${kickLog.executorName} • Member count: ${member.guild.memberCount}`
                    : `Member count: ${member.guild.memberCount}`,
                })
                .setThumbnail(member.displayAvatarURL())
                .setColor("DarkOrange")
                .setTimestamp(Date.now()),
            ],
          });

          // [Record for moderation history + abuse check]
          await recordModeration({
            guildId: member.guild.id,
            userId: member.user.id,
            userName: member.user.username,
            action: "kick",
            reason: kickLog.reason,
            moderatorId: kickLog.executorId ?? null,
            moderatorName: kickLog.executorName ?? null,
          });

          if (kickLog.executorId) {
            await checkModeratorActivity({
              guild: member.guild,
              moderatorId: kickLog.executorId,
              moderatorName: kickLog.executorName || kickLog.executorId,
            });
          }
        } else {
          await staffLog.send({
            embeds: [
              new EmbedBuilder()
                .setAuthor({
                  name: `${member.user.username} has left`,
                  iconURL: member.displayAvatarURL(),
                })
                .addFields(
                  {
                    name: "User",
                    value: stringifyName(member),
                  },
                  {
                    name: "Roles",
                    value: stringifyRoles(member),
                  },
                  {
                    name: "Joined Server",
                    value: DateUtils.distanceFromNow(member.joinedTimestamp),
                  },
                  {
                    name: "Account Created",
                    value: DateUtils.distanceFromNow(
                      member.user.createdTimestamp
                    ),
                  }
                )
                .setFooter({
                  text: `Member count: ${member.guild.memberCount}`,
                })
                .setThumbnail(member.displayAvatarURL())
                .setColor("DarkRed")
                .setTimestamp(Date.now()),
            ],
          });
        }

        // [Sync member to DB]
        await syncMember(member);
      } catch (error) {
        logError(error, __filename);
      }
    },
  };
}
