import { AuditLogEvent } from "discord.js";
import { WEventListener } from "../types/w-event-listener";
import { logError } from "../utils/log-error";
import { syncMember } from "../utils/sync-member";
import { recordModeration } from "../utils/record-moderation";
import { stimulateDelay } from "../utils/stimulate-delay";

export default function listener(): WEventListener {
  return {
    name: "guildMemberUpdate",
    handler: async (oldMember, newMember) => {
      try {
        // [Check if roles were changed]
        if (
          oldMember.roles.cache.size !== newMember.roles.cache.size ||
          !oldMember.roles.cache.every((role) =>
            newMember.roles.cache.has(role.id)
          )
        ) {
          await syncMember(newMember, "guildMemberUpdate");
        }

        // [Detect timeout for moderation history]
        // A Discord timeout sets communication_disabled_until. We record when a
        // timeout is newly applied (or extended) and is still active.
        const oldUntil = oldMember.communicationDisabledUntilTimestamp ?? null;
        const newUntil = newMember.communicationDisabledUntilTimestamp ?? null;

        if (newUntil && newUntil > Date.now() && newUntil !== oldUntil) {
          await stimulateDelay(1000);

          let moderatorId: string | null = null;
          let moderatorName: string | null = null;
          let reason: string | null = null;
          try {
            const auditLogs = await newMember.guild.fetchAuditLogs({
              type: AuditLogEvent.MemberUpdate,
              limit: 10,
            });

            const entry = auditLogs.entries.find(
              (e) =>
                e.target?.id === newMember.id &&
                Date.now() - e.createdTimestamp < 10000 &&
                e.changes.some(
                  (c) => c.key === "communication_disabled_until"
                )
            );

            if (entry) {
              moderatorId = entry.executor?.id ?? null;
              moderatorName = entry.executor?.displayName ?? null;
              reason = entry.reason ?? null;
            }
          } catch (auditError) {
            logError(auditError, __filename);
          }

          await recordModeration({
            guildId: newMember.guild.id,
            userId: newMember.id,
            userName: newMember.user.username,
            action: "timeout",
            reason,
            moderatorId,
            moderatorName,
            metadata: { until: new Date(newUntil).toISOString() },
          });
        }
      } catch (error) {
        logError(error, __filename);
      }
    },
  };
}
