import { EmbedBuilder } from "discord.js";
import { WSlashCommand } from "../types/w-slash-command";
import { getChannel } from "../utils/get-channel";

export default function Command(): WSlashCommand {
  return {
    name: "bulkremind",
    description:
      "Creates multiple embeds mentioning users in message-logs channel",
    options: [
      {
        name: "count",
        description: "Number of embeds to create",
        type: 4, // integer
        required: true,
      },
      {
        name: "user_ids",
        description: "Comma-separated list of user IDs",
        type: 3, // string
        required: true,
      },
    ],
    access_control: "MOD_AND_ABOVE",
    execute: async (interaction) => {
      try {
        const count = interaction.options.get("count")?.value as number;
        const userIDsInput = interaction.options.get("user_ids")
          ?.value as string;
        const userIDs = userIDsInput
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);

        const logChannel = getChannel("message-logs", "text", interaction);
        if (!logChannel) {
          await interaction.reply({
            content: "❌ Could not find `message-logs` channel.",
            flags: ["Ephemeral"],
          });
          return;
        }

        // Create embeds
        const embeds: EmbedBuilder[] = [];
        for (let i = 0; i < count; i++) {
          const userID = userIDs[i % userIDs.length]; // loop if fewer IDs
          const embed = new EmbedBuilder()
            .setTitle(`📢 Reminder #${i + 1}`)
            .setDescription(`Hey <@${userID}> — this is your reminder!`)
            .setColor("Blue")
            .setTimestamp(Date.now())
            .setFooter({
              text: `Triggered by ${interaction.user.username}`,
              iconURL: interaction.user.displayAvatarURL(),
            });
          embeds.push(embed);
        }

        // Send embeds to the log channel
        for (const embed of embeds) {
          await logChannel.send({ embeds: [embed] });
        }

        await interaction.reply({
          content: `✅ Sent ${embeds.length} embeds to #message-logs.`,
          flags: ["Ephemeral"],
        });
      } catch (err) {
        console.error("bulkremind error:", err);
        await interaction.reply({
          content: "❌ Failed to create embeds. Check console for errors.",
          flags: ["Ephemeral"],
        });
      }
    },
  };
}
