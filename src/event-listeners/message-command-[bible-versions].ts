import { EmbedBuilder } from "discord.js";
import { WEventListener } from "../types/w-event-listener";
import { logError } from "../utils/log-error";

const TRIGGER = /^(?:bible\s+versions?|versions?\s+bible)$/i;

const VERSIONS = [
  { abbrev: "sct",    name: "Submitters Community Translation", note: "default" },
  { abbrev: "kjv",    name: "King James Version" },
  { abbrev: "asv",    name: "American Standard Version" },
  { abbrev: "bbe",    name: "Bible in Basic English" },
  { abbrev: "web",    name: "World English Bible" },
  { abbrev: "webbe",  name: "World English Bible (British Edition)" },
  { abbrev: "ylt",    name: "Young's Literal Translation" },
  { abbrev: "dra",    name: "Douay-Rheims 1899" },
  { abbrev: "darby",  name: "Darby Bible" },
  { abbrev: "oeb-us", name: "Open English Bible (US Edition)" },
  { abbrev: "oeb-cw", name: "Open English Bible (Commonwealth Edition)" },
  { abbrev: "nrsvue", name: "New Revised Standard Version Updated", note: "requires API key" },
];

export default function listener(): WEventListener {
  return {
    name: "messageCreate",
    handler: async (message) => {
      try {
        if (message.author.bot) return;
        if (!TRIGGER.test(message.content.trim())) return;

        const lines = VERSIONS.map((v) => {
          const tag = v.note ? ` *(${v.note})*` : "";
          return `\`${v.abbrev.padEnd(7)}\`  ${v.name}${tag}`;
        }).join("\n");

        const embed = new EmbedBuilder()
          .setColor("Purple")
          .setTitle("Bible Translations")
          .setDescription(lines)
          .setFooter({
            text: `Usage: john 3:16 kjv  ·  mark 1:1  ·  genesis 1:1-3 web`,
          });

        await message.reply({ embeds: [embed] });
      } catch (error) {
        logError(error, __filename);
      }
    },
  };
}
