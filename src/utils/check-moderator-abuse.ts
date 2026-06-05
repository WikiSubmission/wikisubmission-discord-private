import { EmbedBuilder, Guild } from "discord.js";
import { getChannel } from "./get-channel";
import { getRole, getActualRoleName } from "./get-role";
import { getSupabaseInternalClient } from "./get-supabase-client";
import { logError } from "./log-error";

// Thresholds are evaluated over a rolling 24-hour window of a single
// moderator's kicks + bans.
const REPORT_THRESHOLD = 3;
const SUSPEND_THRESHOLD = 10;

// When the suspend threshold is tripped, every role is stripped except these
// (server leadership). Discord-managed roles (bot/integration/booster) are also
// preserved since they cannot be removed manually anyway.
const PROTECTED_ROLE_NAMES = ["Admin", "Administrator"];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * After a kick or ban is recorded, evaluate how many kicks + bans the acting
 * moderator has performed in the last 24 hours and escalate if needed:
 *  - 3+  -> post a report in mod-chat (once, when the threshold is crossed)
 *  - 10+ -> strip their moderation roles pending review and escalate
 *
 * Never throws: failures are logged so the underlying moderation action is
 * unaffected.
 */
export async function checkModeratorActivity(params: {
  guild: Guild;
  moderatorId: string;
  moderatorName: string;
}): Promise<void> {
  try {
    const { guild, moderatorId, moderatorName } = params;

    // Ignore the bot itself (automated/bulk actions).
    if (!moderatorId || moderatorId === guild.client.user?.id) return;

    const since = new Date(Date.now() - ONE_DAY_MS).toISOString();
    const { count, error } = await getSupabaseInternalClient()
      .from("ws_discord_moderation_logs")
      .select("id", { count: "exact", head: true })
      .eq("guild_id", guild.id)
      .eq("moderator_id", moderatorId)
      .in("action", ["ban", "kick"])
      .gte("created_at", since);

    if (error) {
      logError(error, __filename);
      return;
    }

    const total = count ?? 0;
    if (total < REPORT_THRESHOLD) return;

    const modChat = getChannel("mod-chat", "text", guild);

    // [Suspend at 10+]
    if (total >= SUSPEND_THRESHOLD) {
      const removedRoles: string[] = [];
      try {
        const member = await guild.members.fetch(moderatorId);
        const protectedNames = new Set(
          PROTECTED_ROLE_NAMES.map((name) => getActualRoleName(name))
        );
        // Strip every role except @everyone, managed roles, and leadership.
        const rolesToRemove = member.roles.cache.filter(
          (role) =>
            role.id !== guild.id &&
            !role.managed &&
            !protectedNames.has(role.name)
        );
        for (const role of rolesToRemove.values()) {
          await member.roles.remove(
            role.id,
            "Auto-suspended: 10+ kicks/bans in 24h, pending moderation review."
          );
          removedRoles.push(role.name);
        }
      } catch (fetchError) {
        logError(fetchError, __filename);
      }

      // Only alert when roles were actually removed, so the escalation fires
      // once rather than on every subsequent action.
      if (modChat && removedRoles.length > 0) {
        const adminRole = getRole("Admin", guild);
        await modChat.send({
          content: adminRole ? `<@&${adminRole.id}>` : undefined,
          embeds: [
            new EmbedBuilder()
              .setTitle("🚨 Moderator auto-suspended")
              .setDescription(
                `<@${moderatorId}> has performed **${total}** kicks/bans in the last 24 hours and has been temporarily stripped of moderation roles pending review.`
              )
              .addFields(
                {
                  name: "Moderator",
                  value: `${moderatorName} (\`${moderatorId}\`)`,
                },
                {
                  name: "Roles removed",
                  value: removedRoles.join(", ") || "None",
                }
              )
              .setColor("DarkRed")
              .setTimestamp(Date.now()),
          ],
        });
      }
      return;
    }

    // [Report at exactly 3 — fire once when the threshold is crossed]
    if (total === REPORT_THRESHOLD && modChat) {
      await modChat.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("⚠️ Moderation activity report")
            .setDescription(
              `<@${moderatorId}> has performed **${total}** kicks/bans in the last 24 hours.`
            )
            .addFields({
              name: "Moderator",
              value: `${moderatorName} (\`${moderatorId}\`)`,
            })
            .setColor("Orange")
            .setTimestamp(Date.now()),
        ],
      });
    }
  } catch (error) {
    logError(error, __filename);
  }
}
