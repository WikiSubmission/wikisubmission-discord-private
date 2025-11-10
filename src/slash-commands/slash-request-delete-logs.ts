import { WSlashCommand } from "../types/w-slash-command";
import { getChannel } from "../utils/get-channel";
import { getRole } from "../utils/get-role";
import { Collection, Message } from "discord.js";
import { getSupabaseClient } from "../utils/get-supabase-client";

export default function Command(): WSlashCommand {
  return {
    name: "request-log-deletion",
    description:
      "Request deletion of logs related to you. Guaranteed deletion within two weeks.",
    access_control: "VERIFIED_AND_ABOVE",

    execute: async (interaction) => {
      try {
        const messageLogs = getChannel("message-logs", "text", interaction);

        if (!messageLogs || !messageLogs.isTextBased()) {
          console.warn(
            "[slash-request-delete-logs] 'message-logs' channel does not exist, skipping"
          );

          const staffLog = getChannel("staff-log", "text", interaction);
          if (staffLog?.isTextBased()) {
            const dev = getRole("Developer", interaction);
            staffLog.send({
              content: dev
                ? `<@&${dev.id}> The \`message-logs\` channel does not exist. User tried to request log deletion.`
                : "The `message-logs\` channel does not exist. User tried to request log deletion. (Developer role not found)",
            });
          }

          await interaction.reply({
            content: "We could not find any logs related to you.",
            flags: "Ephemeral",
          });
          return;
        }

        const userId = interaction.user.id;
        let messageIds: string[] = [];
        let lastId: string | undefined;

        // paginate fetch
        while (true) {
          const fetched: Collection<string, Message> =
            await messageLogs.messages.fetch({
              limit: 100,
              before: lastId,
            });

          if (fetched.size === 0) break;

          // filter for embeds mentioning this user
          const related = fetched.filter((msg) =>
            msg.embeds.some((embed) => {
              const text =
                `${embed.title ?? ""} ${embed.description ?? ""} ${embed.footer?.text ?? ""} ${embed.author?.name ?? ""}`.toLowerCase();
              return (
                text.includes(`<@${userId}>`) ||
                text.includes(interaction.user.username.toLowerCase())
              );
            })
          );

          // collect their IDs
          messageIds.push(...related.map((m) => m.id));

          lastId = fetched.last()?.id;
        }

        if (messageIds.length === 0) {
          await interaction.reply({
            content: "We found no logs related to you.",
            flags: "Ephemeral",
          });
          return;
        }

        const supaClient = getSupabaseClient();

        await supaClient.from("ws_discord_message_deletion_schedule").insert([
          {
            channel_id: messageLogs.id,
            message_ids: messageIds,
            request_by_id: interaction.user.id,
            execute_at: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(), // 1 week later
          },
        ]);

        await interaction.reply({
          content: `Your request was received. **${messageIds.length}** log(s) will be deleted shortly.`,
          flags: "Ephemeral",
        });
      } catch (error) {
        console.error("[slash-request-delete-logs] Error:", error);
        await interaction.reply({
          content:
            "Something went wrong while processing your request. Please contact staff.",
          flags: "Ephemeral",
        });
      }
    },
  };
}
