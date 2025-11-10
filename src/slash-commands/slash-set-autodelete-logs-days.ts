import { WSlashCommand } from "../types/w-slash-command";
import { getSupabaseInternalClient } from "../utils/get-supabase-client";

export default function Command(): WSlashCommand {
  return {
    name: "set-logs-autodelete-days",
    description:
      "Set number of days before automatically purging stored message logs.",
    access_control: "ADMIN",
    options: [
      {
        name: "days",
        description: "Number of days before purging logs",
        type: 4, // INTEGER
        required: true,
      },
    ],
    execute: async (interaction) => {
      try {
        await interaction.deferReply();
        const days = Number(interaction.options.get("days")?.value);

        if (!Number.isFinite(days) || days <= 0) {
          await interaction.editReply({
            content: "❌ Days must be a positive number greater than 0.",
          });
          return;
        }

        const supaClient = getSupabaseInternalClient();
        const timestamp = new Date().toISOString();

        // Upsert both: duration and timestamp
        const { error } = await supaClient.from("ws_discord_constants").upsert(
          [
            {
              key: "AUTO_DELETE_LOGS_AFTER",
              value: days.toString(),
            },
            {
              key: "AUTO_DELETE_LOGS_AFTER_LAST_TIMESTAMP",
              value: timestamp,
            },
          ],
          { onConflict: "key" }
        );

        if (error) {
          console.error("[set-logs-autodelete-days] DB error:", error);
          await interaction.editReply({
            content: "❌ Failed to update setting. Check logs for details.",
          });
          return;
        }

        await interaction.editReply({
          content: `✅ Log auto-delete period set to **${days} day(s)**.\n🕓 Last updated: <t:${Math.floor(
            Date.now() / 1000
          )}:F>`,
        });
      } catch (err) {
        console.error("[set-logs-autodelete-days] Unexpected error:", err);
        await interaction.editReply({
          content: "⚠️ Something went wrong while updating the setting.",
        });
      }
    },
  };
}
