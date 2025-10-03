import { Collection, Message } from "discord.js";
import { Bot } from "../bot/client";
import { SupportedGuilds } from "../constants/supported-guilds";
import { ScheduledTaskManager } from "../utils/discord/create-scheduled-action";
import { getChannel } from "../utils/discord/get-channel";
import { getRole } from "../utils/discord/get-role";
import { getSupabaseClient } from "../utils/get-supabase-client";

export default function action(): ScheduledTaskManager {
  return new ScheduledTaskManager({
    id: "AUTO_DELETE_LOGS",
    description: "Auto delete logs that are older than X days",
    interval: "EVERY_WEEK",
    action: async () => {
      console.log("[AUTO_DELETE_LOGS] Task started");

      try {
        console.log("[AUTO_DELETE_LOGS] Bot logged in?", Bot.client.isReady());

        const guild = await Bot.client.guilds.fetch(
          process.env.NODE_ENV === "production"
            ? SupportedGuilds.Production.id
            : SupportedGuilds.Development.id,
        );
        console.log(
          `[AUTO_DELETE_LOGS] Using guild: ${guild.name} (${guild.id})`,
        );

        const messageLogs = getChannel("message-logs", "text", guild);
        if (!messageLogs) {
          console.warn(
            "[AUTO_DELETE_LOGS] 'message_logs' channel does not exist, skipping",
          );
          const staffLog = getChannel("staff-log", "text", guild);
          if (staffLog?.isTextBased()) {
            const dev = getRole("Developer", guild);
            staffLog.send({
              content: dev
                ? `<@&${dev.id}> The \`message_logs\` channel does not exist. Auto-delete cron job skipped.`
                : "The `message_logs` channel does not exist. Auto-delete cron job skipped. (Developer role not found)",
            });
          }
          return;
        }
        console.log(`[AUTO_DELETE_LOGS] Operating in #${messageLogs.name}`);

        const supaClient = getSupabaseClient();
        const { data, error, status } = await supaClient
          .from("DiscordSecrets")
          .select("*")
          .in("key", ["DISCORD_AUTO_DELETE_LOGS_AFTER"]);

        if (error) {
          console.error("[AUTO_DELETE_LOGS] Error fetching secrets:", error);
          return;
        }

        const secrets =
          status === 200 && data
            ? Object.fromEntries(data.map((row) => [row.key, row.value]))
            : {};
        const DELETE_AFTER_DAYS = parseInt(
          secrets["DISCORD_AUTO_DELETE_LOGS_AFTER"] ?? "0",
        );

        const deleteBefore =
          Date.now() - DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000;
        console.log(
          `[AUTO_DELETE_LOGS] DELETE_AFTER_DAYS=${DELETE_AFTER_DAYS}, deleteBefore=${new Date(deleteBefore).toISOString()}`,
        );

        if (messageLogs?.isTextBased()) {
          let lastId: string | undefined;
          let totalDeleted = 0;

          while (true) {
            const fetched: Collection<string, Message> =
              await messageLogs.messages.fetch({
                limit: 100,
                before: lastId,
              });
            console.log(
              `[AUTO_DELETE_LOGS] Fetched ${fetched.size} messages (before=${lastId})`,
            );

            if (fetched.size === 0) break;

            const oldMessages = fetched.filter(
              (msg) => msg.createdTimestamp < deleteBefore,
            );
            console.log(
              `[AUTO_DELETE_LOGS] Found ${oldMessages.size} old messages out of ${fetched.size}`,
            );

            if (oldMessages.size === 0) break;

            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            const bulkDeletable = oldMessages.filter(
              (msg) => msg.createdTimestamp > twoWeeksAgo,
            );
            const tooOld = oldMessages.filter(
              (msg) => msg.createdTimestamp <= twoWeeksAgo,
            );

            if (bulkDeletable.size > 0) {
              console.log(
                `[AUTO_DELETE_LOGS] Bulk deleting ${bulkDeletable.size} messages: [${[
                  ...bulkDeletable.keys(),
                ].join(", ")}]`,
              );
              await messageLogs
                .bulkDelete(bulkDeletable, true)
                .catch(console.error);
              totalDeleted += bulkDeletable.size;
            }

            for (const msg of tooOld.values()) {
              console.log(
                `[AUTO_DELETE_LOGS] Individually deleting message ${msg.id} (${new Date(
                  msg.createdTimestamp,
                ).toISOString()})`,
              );
              await msg.delete().catch(console.error);
              totalDeleted++;
            }

            console.log(
              `[AUTO_DELETE_LOGS] Deleted ${totalDeleted} messages so far`,
            );

            lastId = fetched.last()?.id;
          }

          console.log(
            `[AUTO_DELETE_LOGS] Task finished, deleted ${totalDeleted}`,
          );
        }
      } catch (error) {
        console.error("[AUTO_DELETE_LOGS] Task error:", error);
      }
    },
  });
}
