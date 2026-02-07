import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} from "discord.js";
import { WSlashCommand } from "../types/w-slash-command";

const BASE_URL = "https://library.wikisubmission.org/file/discord/debate/";
const DEBATE_MAP: Record<string, string> = {
  "Venn Diagram Submission": "/venndiagramsubmission.png",
  "Prayer Times Diagram": "/prayertimesdiagram.png",
  "Salat Brochure": "/salat_brochure.pdf",
  "10,13,15 Hadith": "/10_13_15hadith.jpg",
  "Hafs vs Warsh (8 Differences)": "/hafs_vs_warsh___8_differences.jpg",
  "Haziq - Warsh vs Hafs": "/haziq__warsh_v_hafs.jpg",
  "Miskeen vs Masakin": "/miskeen_vs_masakin.jpg",
  "Extra Hadith Dietary Prohibitions": "/extra_hadith_dietary_prohibitions.png",
  "Prophet's Final Sermon": "/prophet_s_final_sermon_s_.png",
  "Muslim to Submitter": "/muslim_to_submitter.jpg",
  "Quran is Perfect/Fully Detailed":
    "/the_quran_is_perfect__fully_detailed__etc.jpg",
  "Rashad Life Miracles": "/rashad_life_miracles.jpg",
};

export default function Command(): WSlashCommand {
  return {
    name: "debate",
    description: "Select a diagram or document to display for a debate",
    execute: async (interaction) => {
      try {
        // 1. Create the Select Menu
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("debate-select")
          .setPlaceholder("Choose a diagram or document...")
          .addOptions(
            Object.keys(DEBATE_MAP)
              .slice(0, 25)
              .map((label) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(label)
                  .setValue(label)
                  .setDescription(`Show: ${label}`)
              )
          );

        const row =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            selectMenu
          );

        // 2. Send the initial ephemeral message
        const response = await interaction.reply({
          content: "Please select a resource to share in this channel:",
          components: [row],
          ephemeral: true,
        });

        // 3. Create a collector to handle the selection
        const collector = response.createMessageComponentCollector({
          componentType: ComponentType.StringSelect,
          time: 60000, // 1 minute timeout
        });

        collector.on("collect", async (i) => {
          const selectedLabel = i.values[0];
          const path = DEBATE_MAP[selectedLabel];
          const fullUrl = `${BASE_URL}${path}`;

          const isPdf = path.endsWith(".pdf");

          const embed = new EmbedBuilder()
            .setTitle(`${selectedLabel}`)
            .setColor(0x00bcd4)
            .setTimestamp()
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            });

          // Embeds can't display PDFs directly as images, so we handle differently
          if (isPdf) {
            embed.setDescription(
              `**[Click here to view PDF](${fullUrl})**\nThis document is a visual reference for the current debate.`
            );
            // Send to the channel (publicly)
            if (interaction.channel && "send" in interaction.channel) {
              await interaction.channel.send({
                embeds: [embed],
              });
            }
          } else {
            embed
              .setDescription("Visual reference for the current debate.")
              .setImage(fullUrl);
            // Send to the channel (publicly)
            if (interaction.channel && "send" in interaction.channel) {
              await interaction.channel.send({
                embeds: [embed],
                content: fullUrl,
              });
            }
          }

          // Confirm to the user that it was sent
          await i.reply({
            content: "Resource sent to chat.",
            ephemeral: true,
          });
        });
      } catch (err) {
        console.error("[debate] Error:", err);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "An error occurred.",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "An error occurred.",
            ephemeral: true,
          });
        }
      }
    },
  };
}
