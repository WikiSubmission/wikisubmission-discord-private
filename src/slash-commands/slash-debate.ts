import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} from "discord.js";
import { WSlashCommand } from "../types/w-slash-command";

const BASE_URL = "https://cdn.wikisubmission.org/discord/debate";

interface Resource {
  path: string;
  description: string;
}

const DEBATE_RESOURCES: Record<string, Resource> = {
  "Venn Diagram Submission": {
    path: "/venndiagramsubmission.png",
    description: "Submission Vs Quranism Vs Islam",
  },
  "Prayer Times Diagram": {
    path: "/prayertimesdiagram.png",
    description: "Visual markers for daily prayer windows with Quranic verses.",
  },
  "Salat Brochure": {
    path: "/salat_brochure.pdf",
    description: "Detailed guide on the methodology and requirements of Salat.",
  },
  "10,13,15 Hadith": {
    path: "/10_13_15hadith.jpg",
    description:
      "Reference regarding specific contradiction regarding the number of years Mohammed spent in mecca",
  },
  "Hafs vs Warsh (8 Differences)": {
    path: "/hafs_vs_warsh___8_differences.jpg",
    description:
      "Comparison of linguistic variations between Qira'at of the Quran.",
  },
  "Haziq - Warsh vs Hafs": {
    path: "/haziq__warsh_v_hafs.jpg",
    description: "Specific analysis of Warsh and Hafs recitation differences.",
  },
  "Miskeen vs Masakin": {
    path: "/miskeen_vs_masakin.jpg",
    description: "Differences in spelling of words",
  },
  "Extra Hadith Dietary Prohibitions": {
    path: "/extra_hadith_dietary_prohibitions.png",
    description: "Comparison of Quranic dietary laws vs Hadith additions.",
  },
  "Prophet's Final Sermon": {
    path: "/prophet_s_final_sermon_s_.png",
    description:
      "Historical text of the final sermon during the farewell pilgrimage, or lack of.",
  },
  "Muslim to Submitter": {
    path: "/muslim_to_submitter.jpg",
    description: "Theological differences from Islam to submission.",
  },
  "Quran is Perfect/Fully Detailed": {
    path: "/the_quran_is_perfect__fully_detailed__etc.jpg",
    description:
      "Evidence for the sufficiency and completeness of the Quranic text.",
  },
  "Rashad Life Miracles": {
    path: "/rashad_life_miracles.jpg",
    description:
      "Documentation of events associated with the messenger of the covenant.",
  },
};

export default function Command(): WSlashCommand {
  return {
    name: "debate",
    description: "Select a diagram or document to display for a debate",
    execute: async (interaction) => {
      try {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("debate-select")
          .setPlaceholder("Select resource")
          .addOptions(
            Object.keys(DEBATE_RESOURCES).map((label) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(label)
                .setValue(label)
            )
          );

        const row =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            selectMenu
          );

        const response = await interaction.reply({
          content: "Select resource to display:",
          components: [row],
          ephemeral: true,
        });

        const collector = response.createMessageComponentCollector({
          componentType: ComponentType.StringSelect,
          time: 60000,
        });

        collector.on("collect", async (i) => {
          const label = i.values[0];
          const resource = DEBATE_RESOURCES[label];
          const fullUrl = `${BASE_URL}${resource.path}`;
          const isPdf = resource.path.toLowerCase().endsWith(".pdf");

          if (interaction.channel && "send" in interaction.channel) {
            if (isPdf) {
              const embed = new EmbedBuilder()
                .setTitle(label)
                .setDescription(
                  `${resource.description}\n\n[View PDF Document](${fullUrl})`
                )
                .setColor(0x00bcd4)
                .setTimestamp()
                .setFooter({
                  text: `Requested by ${interaction.user.tag}`,
                  iconURL: interaction.user.displayAvatarURL(),
                });

              await interaction.channel.send({ embeds: [embed] });
            } else {
              await interaction.channel.send({ content: fullUrl });
            }
          }

          await i.reply({
            content: "Resource dispatched.",
            ephemeral: true,
          });
        });
      } catch (err) {
        console.error("[debate] Execution error:", err);
      }
    },
  };
}
