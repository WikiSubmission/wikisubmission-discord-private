import { WSlashCommand } from "../types/w-slash-command";
import { getSupabaseClient } from "../utils/get-supabase-client";

export default function Command(): WSlashCommand {
  return {
    name: "set-logs-autodelete-days",
    description: "Set number of days before purging logs.",
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
        const daysString = interaction.options.get("days")?.value as string;
        const days = parseInt(daysString);
        if (days <= 0) {
          interaction.reply({
            content: "Days must be greater than 0.",
            ephemeral: true,
          });
          return;
        }

        const supaClient = getSupabaseClient();

        // Upsert the key-value pair
        const { error } = await supaClient.from("DiscordSecrets").upsert({
          key: "DISCORD_AUTO_DELETE_LOGS_AFTER",
          value: days.toString(),
        });

        if (error) {
          console.error("[set-logs-autodelete-days] DB error:", error);
          interaction.reply({
            content: "Failed to update setting. Check logs.",
            ephemeral: true,
          });
          return;
        }

        await interaction.reply({
          content: `Log auto-delete period has been set to **${days} day(s)**.`,
          ephemeral: true,
        });
        return;
      } catch (error) {
        console.error("[set-logs-autodelete-days] Error:", error);
        await interaction.reply({
          content: "Something went wrong.",
          ephemeral: true,
        });
        return;
      }
    },
  };
}
