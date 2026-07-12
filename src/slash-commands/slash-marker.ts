import {
  AutocompleteInteraction,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { WSlashCommand } from "../types/w-slash-command";
import { getSupabaseInternalClient } from "../utils/get-supabase-client";
import { logError } from "../utils/log-error";

const NAME_MAX_LENGTH = 64;
const CONTENT_MAX_LENGTH = 1900;
const LIST_LIMIT = 50;
const AUTOCOMPLETE_LIMIT = 25; // Discord caps autocomplete at 25 choices.

async function autocompleteMarkerNames(
  interaction: AutocompleteInteraction
): Promise<void> {
  const focused = interaction.options.getFocused()?.toString() ?? "";

  const supaClient = getSupabaseInternalClient();
  let query = supaClient
    .from("ws_discord_markers")
    .select("name")
    .order("updated_at", { ascending: false })
    .limit(AUTOCOMPLETE_LIMIT);

  if (focused.trim()) {
    query = query.ilike("name", `%${focused.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[marker autocomplete] DB error:", error);
    await interaction.respond([]);
    return;
  }

  await interaction.respond(
    (data ?? []).map((m) => ({ name: m.name, value: m.name }))
  );
}

export default function Command(): WSlashCommand {
  return {
    name: "marker",
    description: "Create and manage named markers (string notes)",
    access_control: "COMMUNITY_AND_ABOVE",
    autocomplete: autocompleteMarkerNames,
    options: [
      {
        name: "set",
        description: "Create or update a marker",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "name",
            description: "Unique name for the marker",
            type: 3, // STRING
            required: true,
            max_length: NAME_MAX_LENGTH,
          },
          {
            name: "content",
            description: "The string content to store",
            type: 3, // STRING
            required: true,
            max_length: CONTENT_MAX_LENGTH,
          },
        ],
      },
      {
        name: "get",
        description: "Show a marker's content",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "name",
            description: "Name of the marker to show",
            type: 3, // STRING
            required: true,
            max_length: NAME_MAX_LENGTH,
            autocomplete: true,
          },
        ],
      },
      {
        name: "list",
        description: "List all markers",
        type: 1, // SUB_COMMAND
      },
      {
        name: "delete",
        description: "Delete a marker",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "name",
            description: "Name of the marker to delete",
            type: 3, // STRING
            required: true,
            max_length: NAME_MAX_LENGTH,
            autocomplete: true,
          },
        ],
      },
    ],
    execute: async (interaction) => {
      // [Subcommands are only available on chat input commands]
      if (!interaction.isChatInputCommand()) return;

      const subcommand = interaction.options.getSubcommand();

      try {
        // [Posting a marker (get) is public; management actions stay ephemeral]
        await interaction.deferReply(
          subcommand === "get" ? {} : { flags: ["Ephemeral"] }
        );

        const supaClient = getSupabaseInternalClient();

        switch (subcommand) {
          case "set": {
            const name = interaction.options.getString("name", true).trim();
            const content = interaction.options.getString("content", true);

            if (!name) {
              await interaction.editReply({
                content: "❌ Marker name cannot be empty.",
              });
              return;
            }

            const timestamp = new Date().toISOString();
            const { error } = await supaClient
              .from("ws_discord_markers")
              .upsert(
                {
                  name,
                  content,
                  updated_at: timestamp,
                  author_id: interaction.user.id,
                  // [Store the display name only (e.g. "Hichem"), not the username]
                  author_name:
                    interaction.member instanceof GuildMember
                      ? interaction.member.displayName
                      : interaction.user.displayName,
                },
                { onConflict: "name" }
              );

            if (error) {
              console.error("[marker set] DB error:", error);
              await interaction.editReply({
                content: "❌ Failed to save marker. Check logs for details.",
              });
              return;
            }

            await interaction.editReply({
              content: `✅ Marker **${name}** saved.`,
            });
            return;
          }

          case "get": {
            const name = interaction.options.getString("name", true).trim();

            const { data, error } = await supaClient
              .from("ws_discord_markers")
              .select("name, content, updated_at, author_name")
              .eq("name", name)
              .maybeSingle();

            if (error) {
              console.error("[marker get] DB error:", error);
              await interaction.editReply({
                content: "❌ Failed to fetch marker. Check logs for details.",
              });
              return;
            }

            if (!data) {
              await interaction.editReply({
                content: `❌ No marker named **${name}** found.`,
              });
              return;
            }

            // [Strip any stored <@id> mention: it renders as raw text in footers]
            const authorName = data.author_name
              ?.replace(/<@!?\d+>/g, "")
              .trim();

            const embed = new EmbedBuilder()
              .setTitle(`📌 ${data.name}`)
              .setDescription(data.content)
              .setFooter({
                text: authorName ? `Last updated by ${authorName}` : "Marker",
              })
              .setTimestamp(new Date(data.updated_at));

            await interaction.editReply({ embeds: [embed] });
            return;
          }

          case "list": {
            const { data, error } = await supaClient
              .from("ws_discord_markers")
              .select("name, updated_at")
              .order("updated_at", { ascending: false })
              .limit(LIST_LIMIT);

            if (error) {
              console.error("[marker list] DB error:", error);
              await interaction.editReply({
                content: "❌ Failed to list markers. Check logs for details.",
              });
              return;
            }

            if (!data || data.length === 0) {
              await interaction.editReply({
                content: "📭 No markers have been created yet.",
              });
              return;
            }

            const lines = data
              .map(
                (m) =>
                  `• **${m.name}** — updated <t:${Math.floor(
                    new Date(m.updated_at).getTime() / 1000
                  )}:R>`
              )
              .join("\n");

            const embed = new EmbedBuilder()
              .setTitle(`📌 Markers (${data.length})`)
              .setDescription(lines);

            await interaction.editReply({ embeds: [embed] });
            return;
          }

          case "delete": {
            const name = interaction.options.getString("name", true).trim();

            const { data, error } = await supaClient
              .from("ws_discord_markers")
              .delete()
              .eq("name", name)
              .select("name");

            if (error) {
              console.error("[marker delete] DB error:", error);
              await interaction.editReply({
                content: "❌ Failed to delete marker. Check logs for details.",
              });
              return;
            }

            if (!data || data.length === 0) {
              await interaction.editReply({
                content: `❌ No marker named **${name}** found.`,
              });
              return;
            }

            await interaction.editReply({
              content: `🗑️ Marker **${name}** deleted.`,
            });
            return;
          }

          default: {
            await interaction.editReply({
              content: `❌ Unknown subcommand: ${subcommand}`,
            });
            return;
          }
        }
      } catch (err) {
        logError(err, "slash-marker");
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: "⚠️ Something went wrong while handling the marker.",
          });
        }
      }
    },
  };
}
