import { EmbedBuilder } from 'discord.js';
import { Database } from '../types/generated/database.types';
import { ScheduledTaskManager } from '../utils/discord/create-scheduled-action';
import { getChannel } from '../utils/discord/get-channel';
import { logError } from '../utils/log-error';

export default function action(): ScheduledTaskManager {
  return new ScheduledTaskManager({
    id: 'DAILY_RANDOM_VERSE',
    description: 'Sends a random verse to `#quran` channel every 24 hours',
    interval: 'EVERY_DAY',
    action: async () => {
      const quranChannel = getChannel(process.env.NODE_ENV === "production" ? 'zikr-remembrance' : 'quran', 'text')

      if (!quranChannel) {
        console.warn(`Could not find quran channel (environment=${process.env.NODE_ENV})`);
        return;
      }

      try {
        const randomVerseRequest = await fetch(
          `https://api.wikisubmission.org/quran/random-verse`,
        );
        const randomVerseResult: {
          results: Database['public']['Tables']['DataQuran']['Row'][];
          error?: { name: string; description: string };
        } = await randomVerseRequest.json();
        if (randomVerseResult.results && !randomVerseResult.error) {
          const verse = randomVerseResult.results[0];
          await quranChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`Verse of the Day`)
                .setDescription(
                  `**[${verse.verse_id}]** ${verse.verse_text_english}\n\n${verse.verse_text_arabic}`,
                )
                .setFooter({
                  text: `Sura ${verse.chapter_number}, ${verse.chapter_title_english} (${verse.chapter_title_arabic_transliteration}) • Randomly Generated`,
                })
                .setColor('DarkButNotBlack'),
            ],
          });
        }
      } catch (error) {
        logError(error, 'daily-random-verse');
      }
    },
  });
}
