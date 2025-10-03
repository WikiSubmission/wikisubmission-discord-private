import { Collection, EmbedBuilder, Message } from "discord.js";
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

          // After finishing age-based deletes
          console.log("[AUTO_DELETE_LOGS] Checking scheduled deletions...");

          const { data: scheduled, error: scheduledError } = await supaClient
            .from("DiscordScheduleMessageDeletion")
            .select("*")
            .eq("is_executed", false)
            .lte("execute_at", new Date().toISOString());

          if (scheduledError) {
            console.error(
              "[AUTO_DELETE_LOGS] Error fetching scheduled deletions:",
              scheduledError,
            );
          } else if (scheduled && scheduled.length > 0) {
            console.log(
              `[AUTO_DELETE_LOGS] Found ${scheduled.length} scheduled deletions to process`,
            );

            for (const task of scheduled) {
              try {
                const channel = await Bot.client.channels
                  .fetch(task.channel_id)
                  .catch(() => null);
                if (!channel?.isTextBased()) {
                  console.warn(
                    `[AUTO_DELETE_LOGS] Channel ${task.channel_id} not found or not text-based`,
                  );
                  continue;
                }

                let deletedCount = 0;
                for (const msgId of task.message_ids) {
                  try {
                    const msg = await channel.messages
                      .fetch(msgId)
                      .catch(() => null);
                    if (msg) {
                      await msg.delete();
                      deletedCount++;
                      console.log(
                        `[AUTO_DELETE_LOGS] Deleted message ${msg.id} for request ${task.id}`,
                      );
                    }
                  } catch (err) {
                    console.error(
                      `[AUTO_DELETE_LOGS] Failed deleting message ${msgId} for request ${task.id}`,
                      err,
                    );
                  }
                }

                // Mark as executed in Supabase
                await supaClient
                  .from("DiscordScheduleMessageDeletion")
                  .update({ is_executed: true })
                  .eq("id", task.id);

                console.log(
                  `[AUTO_DELETE_LOGS] Finished scheduled deletion ${task.id}, deleted ${deletedCount} messages`,
                );

                // Try DM first
                let userNotified = false;
                let user: any = null;
                try {
                  user = await Bot.client.users.fetch(task.request_by_id);
                  if (user) {
                    await user.send({
                      content: `✅ Your log deletion request (ID: ${task.id}) has been processed. I deleted **${deletedCount}** messages related to you.`,
                    });
                    userNotified = true;
                    console.log(
                      `[AUTO_DELETE_LOGS] Sent DM to ${user.tag} about deletion request ${task.id}`,
                    );
                  }
                } catch (err) {
                  console.warn(
                    `[AUTO_DELETE_LOGS] Could not DM user ${task.request_by_id}, falling back to staff-log.`,
                  );
                }

                // Build embed with stats
                const embed = new EmbedBuilder()
                  .setTitle("🗑️ Log Deletion Request Processed")
                  .setColor(0xff5555)
                  .addFields(
                    {
                      name: "Request ID",
                      value: task.id.toString(),
                      inline: true,
                    },
                    {
                      name: "Requested By",
                      value: `<@${task.request_by_id}>`,
                      inline: true,
                    },
                    {
                      name: "Deleted Logs",
                      value: deletedCount.toString(),
                      inline: true,
                    },
                  )
                  .setTimestamp();

                // Always log to staff-log
                const staffLog = getChannel("staff-log", "text", guild);
                if (staffLog?.isTextBased()) {
                  await staffLog.send({
                    content: userNotified
                      ? "User was successfully notified via DM."
                      : `<@${task.request_by_id}> could not be DM’d. Informing here instead.`,
                    embeds: [embed],
                  });
                }
              } catch (err) {
                console.error(
                  `[AUTO_DELETE_LOGS] Error processing scheduled task ${task.id}:`,
                  err,
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("[AUTO_DELETE_LOGS] Task error:", error);
      }
    },
  });
}
