import { EmbedBuilder } from "discord.js";
import { Database } from "../types/generated/database.types";
import { WEventListener } from "../types/w-event-listener";
import { stimulateDelay } from "../utils/stimulate-delay";
import { logError } from "../utils/log-error";

export default function listener(): WEventListener {
    return {
        name: 'messageCreate',
        handler: async (message) => {
            try {
                if (message.author.bot) return;

                const lowerContent = message.content.toLowerCase();
                if (!lowerContent.match(/(eq|q)(\s+|\d)/i)) return;

                const verses = detectQuranicVerses(message.content);
                if (verses.length === 0) return;

                await message.channel.sendTyping();

                const formattedVerses = verses
                    .map((v) =>
                        v
                            .toLowerCase()
                            .replace(/^(eq|q)/i, '')
                            .replace(/\s+/g, ''),
                    )
                    .join(',');

                const fetchURL = new URL(
                    `https://api.wikisubmission.org/quran/${formattedVerses}?ngc=true`,
                );
                const request = await fetch(fetchURL);
                const result = await request.json();

                if (!result || !result.results || result.results.length === 0) {
                    const msg = await message.reply(
                        `\`No verse/(s) found with "${verses}"\``,
                    );
                    setTimeout(async () => {
                        try {
                            await msg.delete();
                        } catch (_) { }
                    }, 4000);
                    return;
                }

                let description = '';
                let [iteration, maxVerses, reachedLimit] = [0, 30, false];
                for (const i of result.results) {
                    if (iteration < maxVerses) {
                        if (i.verse_subtitle_english) {
                            description += `${safeMarkdown(`\`${i.verse_subtitle_english}\``)}\n\n`;
                        }
                        description += `**[${i.verse_id}]** ${safeMarkdown(`${i.verse_text_english}\n\n`)}`;
                        if (
                            /\beq\d{1,3}:\d{1,3}(-\d{1,3})?/i.test(
                                message.content.replace(/\s*/g, ''),
                            )
                        ) {
                            description += `(${i.verse_id_arabic}) ${i.verse_text_arabic}\n\n`;
                        }
                        if (message.content.toLowerCase().includes('-t')) {
                            description += `${i.verse_text_arabic_transliteration}\n\n`;
                        }
                        if (i.verse_footnote_english) {
                            description += `*${safeMarkdown(i.verse_footnote_english)}*\n\n`;
                        }
                    } else if (!reachedLimit) {
                        description += `----- You have reached the maximum verse limit per single request (${maxVerses}) -----`;
                        reachedLimit = true;
                    }
                    iteration++;
                }

                if (!description.trim()) return;

                const chunks = splitToChunks(description);
                let i = 0;
                for (const chunk of chunks) {
                    await message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(
                                    `${resolveTitle(result.results)}${i > 1 ? ` (cont'd)` : ``}`,
                                )
                                .setDescription(chunk)
                                .setFooter({ text: `Quran: The Final Testament` })
                                .setColor('DarkButNotBlack'),
                        ],
                    });
                    i++;
                    await stimulateDelay(400);
                }
            } catch (error) {
                logError(error, __filename)
            }
        }
    }
}


function detectQuranicVerses(text: string): string[] {
    // First, normalize the input by replacing multiple spaces with single space
    const normalizedText = text.trim().replace(/\s+/g, ' ');

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
        const withoutCommand = match.replace(/^(eq|q)\s*/i, '');
        // Split by both comma and space, then clean each verse reference
        return withoutCommand
            .split(/[\s,]+/)
            .map((verse) => verse.trim())
            .filter((verse) => verse.match(/^\d{1,3}:\d{1,3}(-\d{1,3})?$/)); // Ensure valid verse format
    });

    return [...new Set(processedMatches)];
}

function safeMarkdown(s?: string | null): string {
    if (!s) return s || '';
    return s.replace(/(?<!\*)\*{1,2}(?!\*)/g, '±') ?? '';
}

function splitToChunks(input: string, max = 3000): string[] {
    const chunks: string[] = [];
    let current = '';
    const lines = input.split('\n');
    for (const line of lines) {
        if (current.length + line.length + 1 > max) {
            chunks.push(current.trim());
            current = line.trim();
        } else {
            current += '\n' + line;
        }
    }
    if (current.length > 0) chunks.push(current.trim());
    return chunks;
}

function resolveTitle(
    data: Database['public']['Tables']['DataQuran']['Row'][],
): string {
    if (!data || data.length === 0) return '--';
    const base = data[0].chapter_number;
    for (const v of data) {
        if (v.chapter_number !== base) return 'Multiple Chapters';
    }
    return `Sura ${data[0].chapter_number}, ${data[0].chapter_title_english} (${data[0].chapter_title_arabic_transliteration})`;
}
