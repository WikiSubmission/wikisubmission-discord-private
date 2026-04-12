import { EmbedBuilder } from "discord.js";
import { WEventListener } from "../types/w-event-listener";
import { stimulateDelay } from "../utils/stimulate-delay";
import { logError } from "../utils/log-error";
import { wsApi } from "../utils/ws-api";

export default function listener(): WEventListener {
  return {
    name: "messageCreate",
    handler: async (message) => {
      try {
        if (message.author.bot) return;

        const lowerContent = message.content.toLowerCase();
        const commandMatch = lowerContent.match(/(eq|q)(\s+|\d)/i);
        if (!commandMatch) return;

        const isEqCommand = commandMatch[1].toLowerCase() === "eq";
        const verses = detectQuranicVerses(message.content);
        if (verses.length === 0) return;

        await message.channel.sendTyping();

        const formattedVerses = verses
          .map((v) =>
            v
              .toLowerCase()
              .replace(/^(eq|q)/i, "")
              .replace(/\s+/g, "")
          )
          .join(",");

        const langs = isEqCommand ? ["en", "ar"] : ["en"];
        const response = await wsApi.getQuran({ verses: formattedVerses, langs });

        if (!response.chapters?.length) {
          const msg = await message.reply(
            `\`No verse/(s) found with "${verses}"\``
          );
          setTimeout(async () => {
            try {
              await msg.delete();
            } catch (_) {}
          }, 3000);
          return;
        } else {
          let description = "";
          let [iteration, maxVerses, reachedLimit] = [0, 30, false];
          for (const chapter of response.chapters) {
            for (const verse of chapter.verses ?? []) {
              if (iteration < maxVerses) {
                if (verse.tr?.["en"]?.s) {
                  description += `${safeMarkdown(`\`${verse.tr["en"].s}\``)}\n\n`;
                }
                description += `**[${verse.vk}]** ${safeMarkdown(`${verse.tr?.["en"]?.tx ?? ""}\n\n`)}`;
                if (isEqCommand) {
                  description += `${verse.tr?.["ar"]?.tx ?? ""}\n\n`;
                }
                if (verse.tr?.["en"]?.f) {
                  description += `*${safeMarkdown(verse.tr["en"].f)}*\n\n`;
                }
              } else if (!reachedLimit) {
                description += `----- You have reached the maximum verse limit per single request (${maxVerses}) -----`;
                reachedLimit = true;
              }
              iteration++;
            }
          }

          if (!description.trim()) return;

          const chunks = splitToChunks(description);
          const chapterTitle = response.chapters[0]?.titles?.["en"] ?? "Quran";

          let i = 0;
          for (const chunk of chunks) {
            await message.reply({
              embeds: [
                new EmbedBuilder()
                  .setTitle(`${chapterTitle}${i > 1 ? ` (cont'd)` : ``}`)
                  .setDescription(chunk)
                  .setFooter({ text: `Quran: The Final Testament` })
                  .setColor("DarkButNotBlack"),
              ],
            });
            i++;
            await stimulateDelay(400);
          }
        }
      } catch (error) {
        logError(error, __filename);
      }
    },
  };
}

function detectQuranicVerses(text: string): string[] {
  // First, normalize the input by replacing multiple spaces with single space
  const normalizedText = text.trim().replace(/\s+/g, " ");

  // Updated patterns to handle both comma and space separation
  const patternA =
    /\b(eq|q)\s*\d{1,3}:\d{1,3}(-\d{1,3})?\b(?:[\s,]+\d{1,3}:\d{1,3}(-\d{1,3})?\b)*/gi;
  const patternB =
    /\beq\d{1,3}:\d{1,3}(-\d{1,3})?(?:[\s,]+\d{1,3}:\d{1,3}(-\d{1,3})?)*\b/gi;

  const matches = normalizedText.match(patternA) || [];
  const simpleMatches = normalizedText.match(patternB) || [];

  // Process each match to split by both comma and space
  const processedMatches = [...matches, ...simpleMatches].flatMap((match) => {
    // Remove the initial eq/q command
    const withoutCommand = match.replace(/^(eq|q)\s*/i, "");
    // Split by both comma and space, then clean each verse reference
    return withoutCommand
      .split(/[\s,]+/)
      .map((verse) => verse.trim())
      .filter((verse) => verse.match(/^\d{1,3}:\d{1,3}(-\d{1,3})?$/)); // Ensure valid verse format
  });

  return [...new Set(processedMatches)];
}

function safeMarkdown(s?: string | null): string {
  if (!s) return s || "";
  return s.replace(/(?<!\*)\*{1,2}(?!\*)/g, "±") ?? "";
}

function splitToChunks(input: string, max = 3000): string[] {
  const chunks: string[] = [];
  let current = "";
  const lines = input.split("\n");
  for (const line of lines) {
    if (current.length + line.length + 1 > max) {
      chunks.push(current.trim());
      current = line.trim();
    } else {
      current += "\n" + line;
    }
  }
  if (current.length > 0) chunks.push(current.trim());
  return chunks;
}
