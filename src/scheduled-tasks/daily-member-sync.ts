import { Bot } from "../bot/client";
import { SupportedGuilds } from "../constants/supported-guilds";
import { ScheduledTaskManager } from "../utils/create-scheduled-action";
import { getSupabaseInternalClient } from "../utils/get-supabase-client";
import { logError } from "../utils/log-error";
import { getActualRoleName } from "../utils/get-role";

export default function action(): ScheduledTaskManager {
  return new ScheduledTaskManager({
    id: "DAILY_MEMBER_SYNC",
    description: "Syncs necessary member data (and removes new member role after 3 days)",
    interval: "EVERY_DAY",
    action: async () => {
      try {
        const guild = await Bot.client.guilds.fetch(
          process.env.NODE_ENV === "production"
            ? SupportedGuilds.Production.id
            : SupportedGuilds.Development.id
        );

        const members = await guild.members.fetch();
        const now = Date.now();
        const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000); // 3 days in milliseconds

        // Remove "New Member" role from members who joined more than 3 days ago
        for (const member of members.values()) {
          const newMemberRole = member.roles.cache.find((role) =>
            role.name.startsWith(getActualRoleName("New Member"))
          );

          if (newMemberRole && member.joinedTimestamp && member.joinedTimestamp < threeDaysAgo) {
            try {
              await member.roles.remove(newMemberRole);
              console.log(`Removed "New Member" role from ${member.user.username} (${member.user.id})`);
            } catch (error) {
              logError(error, __filename);
            }
          }
        }

        const rows = Array.from(members.values()).map((member) => {
          const rolesString = member.roles.cache
            .filter((role) => role.name !== "@everyone")
            .map((role) => role.id)
            .join(",");

          return {
            id: `${member.user.id}*${member.guild.id}`,
            user_id: member.user.id,
            user_name: member.user.username,
            display_name: member.displayName || member.user.username || "--",
            guild_id: member.guild.id,
            joined_timestamp: now,
            created_timestamp: member.user.createdTimestamp,
            avatar_url: member.user.displayAvatarURL(),
            roles: rolesString,
          };
        });

        const BATCH_SIZE = 200;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const chunk = rows.slice(i, i + BATCH_SIZE);
          const result = await getSupabaseInternalClient()
            .from("ws_discord_members")
            .upsert(chunk, { onConflict: "id" });

          if (result.error) {
            logError(result.error, __filename);
          }
        }
      } catch (error) {
        logError(error, __filename);
      }
    },
  });
}
