import { Collection, EmbedBuilder, Message } from "discord.js";
import { Bot } from "../bot/client";
import { SupportedGuilds } from "../constants/supported-guilds";
import { ScheduledTaskManager } from "../utils/create-scheduled-action";
import { getChannel } from "../utils/get-channel";
import { getRole } from "../utils/get-role";
import { getSupabaseClient } from "../utils/get-supabase-client";
import { logError } from "../utils/log-error";

export default function action(): ScheduledTaskManager {
  return new ScheduledTaskManager({
    id: "AUTO_DELETE_LOGS",
    description: "Auto delete logs that are older than X days",
    interval: "EVERY_WEEK",
    action: async () => {
      try {
        const guild = await Bot.client.guilds.fetch(
          process.env.NODE_ENV === "production"
            ? SupportedGuilds.Production.id
            : SupportedGuilds.Development.id
        );

        const messageLogs = getChannel("message-logs", "text", guild);
        if (!messageLogs) {
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

        const supaClient = getSupabaseClient();
        const { data, error } = await supaClient
          .from("ws_discord_constants")
          .select("*")
          .eq("key", "AUTO_DELETE_LOGS_AFTER");

        if (error) {
          logError(error, __filename);
        }

        const DELETE_AFTER_DAYS = data?.[0]?.value ? Number(data[0].value) : -1;

        const deleteBefore =
          Date.now() - DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000;

        if (messageLogs?.isTextBased()) {
          let lastId: string | undefined;
          let totalDeleted = 0;

          while (true) {
            const fetched: Collection<string, Message> =
              await messageLogs.messages.fetch({
                limit: 100,
                before: lastId,
              });

            if (fetched.size === 0) break;

            const oldMessages = fetched.filter(
              (msg) => msg.createdTimestamp < deleteBefore
            );

            if (oldMessages.size === 0) break;

            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            const bulkDeletable = oldMessages.filter(
              (msg) => msg.createdTimestamp > twoWeeksAgo
            );
            const tooOld = oldMessages.filter(
              (msg) => msg.createdTimestamp <= twoWeeksAgo
            );

            if (bulkDeletable.size > 0) {
              await messageLogs
                .bulkDelete(bulkDeletable, true)
                .catch(console.error);
              totalDeleted += bulkDeletable.size;
            }

            for (const msg of tooOld.values()) {
              await msg.delete().catch(console.error);
              totalDeleted++;
            }

            lastId = fetched.last()?.id;
          }

          const { data: scheduled, error: scheduledError } =
            await getSupabaseClient()
              .from("ws_discord_message_deletion_schedule")
              .select("*")
              .eq("is_executed", false)
              .lte("execute_at", new Date().toISOString());

          if (scheduledError) {
            logError(scheduledError, __filename);
          } else if (scheduled && scheduled.length > 0) {
            for (const task of scheduled) {
              try {
                const channel = await Bot.client.channels
                  .fetch(task.channel_id)
                  .catch(() => null);
                if (!channel?.isTextBased()) {
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
                    }
                  } catch (err) {
                    logError(err, __filename);
                  }
                }

                // Mark as executed in Supabase
                await getSupabaseClient()
                  .from("ws_discord_message_deletion_schedule")
                  .update({ is_executed: true })
                  .eq("id", task.id);

                console.log(
                  `[AUTO_DELETE_LOGS] Finished scheduled deletion ${task.id}, deleted ${deletedCount} messages.`
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
                  }
                } catch (err) {
                  logError(err, __filename);
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
                    }
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
                logError(err, __filename);
              }
            }
          }
        }
      } catch (error) {
        logError(error, __filename);
      }
    },
  });
}
