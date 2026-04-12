import { EmbedBuilder } from "discord.js";
import { ScheduledTaskManager } from "../utils/create-scheduled-action";
import { getChannel } from "../utils/get-channel";
import { logError } from "../utils/log-error";
import { wsApi } from "../utils/ws-api";

export default function action(): ScheduledTaskManager {
  return new ScheduledTaskManager({
    id: "DAILY_RANDOM_VERSE",
    description: "Sends a random verse to `#quran` channel every 24 hours",
    interval: "EVERY_DAY",
    action: async () => {
      const quranChannel = getChannel(
        process.env.NODE_ENV === "production" ? "zikr-remembrance" : "quran",
        "text"
      );

      if (!quranChannel) {
        console.warn(
          `Could not find quran channel (environment=${process.env.NODE_ENV})`
        );
        return;
      }

      try {
        const randomChapter = Math.floor(Math.random() * 114) + 1;
        const chapterResponse = await wsApi.getQuran({
          chapter_number_start: randomChapter,
          chapter_number_end: randomChapter,
          langs: ["en", "ar"],
        });

        const chapter = chapterResponse.chapters?.[0];
        const verses = chapter?.verses ?? [];
        const verse = verses[Math.floor(Math.random() * verses.length)];

        if (!chapter || !verse) {
          logError("Random verse fetch failed: empty response", __filename);
          return;
        }

        await quranChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(`Verse of the Day`)
              .setDescription(
                `**[${verse.vk}]** ${verse.tr?.["en"]?.tx ?? ""}\n\n${verse.tr?.["ar"]?.tx ?? ""}`
              )
              .setFooter({
                text: `Sura ${chapter.cn}, ${chapter.titles?.["en"] ?? ""} • Randomly Generated`,
              })
              .setColor("DarkButNotBlack"),
          ],
        });
      } catch (error) {
        logError(error, __filename);
      }
    },
  });
}
