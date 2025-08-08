import { WikiSubmission } from 'wikisubmission-sdk';
import { EmbedBuilder } from 'discord.js';
import { ScheduledTaskManager } from '../utils/discord/create-scheduled-action';
import { getChannel } from '../utils/discord/get-channel';
import { logError } from '../utils/log-error';
import { ws } from '../utils/wikisubmission-sdk';

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
        const randomVerseRequest = await ws.getRandomVerse();

        if (randomVerseRequest instanceof ws.Error) {
          logError(randomVerseRequest.message, 'daily-random-verse');
        } else {
          const verse = randomVerseRequest.response[0];
          await quranChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`Verse of the Day`)
                .setDescription(
                  `**[${verse.verse_id}]** ${verse.verse_text_english}\n\n${verse.verse_text_arabic}`,
                )
                .setFooter({
                  text: `${WikiSubmission.Quran.V1.Methods.formatDataToChapterTitle(randomVerseRequest.response, "english")} • Randomly Generated`,
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
