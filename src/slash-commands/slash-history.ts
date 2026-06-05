import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { WSlashCommand } from "../types/w-slash-command";
import { getSupabaseInternalClient } from "../utils/get-supabase-client";
import { DateUtils } from "../utils/date-utils";
import { logError } from "../utils/log-error";

const HISTORY_DAYS = 10;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Discord embeds allow at most 25 fields.
const MAX_FIELDS = 25;

const ACTION_META: Record<string, { label: string; emoji: string }> = {
  timeout: { label: "Timeout", emoji: "⏳" },
  jail: { label: "Reflection room", emoji: "🔒" },
  ban: { label: "Ban", emoji: "🔨" },
  kick: { label: "Kick", emoji: "👢" },
};

export default function Command(): WSlashCommand {
  return {
    name: "history",
    description: `View a user's moderation history (timeout, reflection room, ban, kick) for the past ${HISTORY_DAYS} days`,
    options: [
      {
        name: "user",
        description: "The user to look up",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
    ],
    access_control: "MOD_AND_ABOVE",
    execute: async (interaction) => {
      try {
        await interaction.deferReply({ flags: ["Ephemeral"] });

        const userId = interaction.options.get("user")?.value;
        if (typeof userId !== "string" || !interaction.guild) {
          await interaction.editReply({ content: "❌ User not found." });
          return;
        }

        const since = new Date(Date.now() - HISTORY_DAYS * ONE_DAY_MS);

        const { data, error } = await getSupabaseInternalClient()
          .from("ws_discord_moderation_logs")
          .select("*")
          .eq("guild_id", interaction.guild.id)
          .eq("user_id", userId)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false });

        if (error) {
          logError(error, __filename);
          await interaction.editReply({
            content: "❌ Failed to fetch moderation history.",
          });
          return;
        }

        if (!data || data.length === 0) {
          await interaction.editReply({
            content: `✅ No moderation actions for <@${userId}> in the past ${HISTORY_DAYS} days.`,
          });
          return;
        }

        // [Tally per action type for the summary line]
        const counts = data.reduce<Record<string, number>>((acc, row) => {
          acc[row.action] = (acc[row.action] ?? 0) + 1;
          return acc;
        }, {});
        const summary = (["timeout", "jail", "ban", "kick"] as const)
          .filter((action) => counts[action])
          .map(
            (action) =>
              `${ACTION_META[action].emoji} ${ACTION_META[action].label}: **${counts[action]}**`
          )
          .join(" • ");

        const embed = new EmbedBuilder()
          .setTitle("Moderation history")
          .setDescription(
            `<@${userId}> — past ${HISTORY_DAYS} days (${data.length} action${
              data.length === 1 ? "" : "s"
            })\n${summary}`
          )
          .setColor("DarkRed")
          .setFooter({ text: `User ID: ${userId}` })
          .setTimestamp(Date.now());

        for (const row of data.slice(0, MAX_FIELDS)) {
          const meta = ACTION_META[row.action] ?? {
            label: row.action,
            emoji: "•",
          };
          const lines = [
            row.reason ? `Reason: ${row.reason}` : "No reason provided",
          ];
          if (row.moderator_name) {
            lines.push(`By: ${row.moderator_name}`);
          }
          embed.addFields({
            name: `${meta.emoji} ${meta.label} • ${DateUtils.distanceFromNow(
              row.created_at
            )}`,
            value: lines.join("\n"),
          });
        }

        if (data.length > MAX_FIELDS) {
          embed.addFields({
            name: "…",
            value: `Showing the ${MAX_FIELDS} most recent of ${data.length} actions.`,
          });
        }

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logError(error, __filename);
        try {
          await interaction.editReply({
            content: "`Internal Server Error`",
          });
        } catch {}
      }
    },
  };
}
