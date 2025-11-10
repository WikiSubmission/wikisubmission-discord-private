import { EmbedBuilder } from "discord.js";
import { ScheduledTaskManager } from "../utils/create-scheduled-action";
import { getChannel } from "../utils/get-channel";
import { logError } from "../utils/log-error";
import { ws } from "../utils/wikisubmission-sdk";

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
        const randomVerseRequest = await ws.Quran.randomVerse();

        if (randomVerseRequest.error) {
          logError(randomVerseRequest.error.message, __filename);
        } else {
          const verse = randomVerseRequest.data;
          await quranChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`Verse of the Day`)
                .setDescription(
                  `**[${verse.verse_id}]** ${verse.ws_quran_text.english}\n\n${verse.ws_quran_text.arabic}`
                )
                .setFooter({
                  text: `Sura ${verse.ws_quran_chapters.chapter_number}, ${verse.ws_quran_chapters.title_english} • Randomly Generated`,
                })
                .setColor("DarkButNotBlack"),
            ],
          });
        }
      } catch (error) {
        logError(error, __filename);
      }
    },
  });
}
