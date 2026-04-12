import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { WSlashCommand } from "../types/w-slash-command";
import { wsApi } from "../utils/ws-api";

// Book name / common abbreviation → book number (1-based, matches ws-backend)
const BIBLE_BOOK_MAP: Record<string, number> = {
  // Old Testament
  genesis: 1,
  gen: 1,
  ge: 1,
  exodus: 2,
  exod: 2,
  ex: 2,
  leviticus: 3,
  lev: 3,
  le: 3,
  numbers: 4,
  num: 4,
  nu: 4,
  deuteronomy: 5,
  deut: 5,
  dt: 5,
  joshua: 6,
  josh: 6,
  jos: 6,
  judges: 7,
  judg: 7,
  jdg: 7,
  ruth: 8,
  rut: 8,
  "1 samuel": 9,
  "1sam": 9,
  "1sa": 9,
  "2 samuel": 10,
  "2sam": 10,
  "2sa": 10,
  "1 kings": 11,
  "1kgs": 11,
  "1ki": 11,
  "2 kings": 12,
  "2kgs": 12,
  "2ki": 12,
  "1 chronicles": 13,
  "1chr": 13,
  "1ch": 13,
  "2 chronicles": 14,
  "2chr": 14,
  "2ch": 14,
  ezra: 15,
  ezr: 15,
  nehemiah: 16,
  neh: 16,
  esther: 17,
  esth: 17,
  est: 17,
  job: 18,
  jb: 18,
  psalms: 19,
  psalm: 19,
  ps: 19,
  psa: 19,
  proverbs: 20,
  prov: 20,
  pr: 20,
  ecclesiastes: 21,
  eccl: 21,
  ec: 21,
  "song of solomon": 22,
  "song of songs": 22,
  song: 22,
  sos: 22,
  ss: 22,
  isaiah: 23,
  isa: 23,
  jeremiah: 24,
  jer: 24,
  lamentations: 25,
  lam: 25,
  ezekiel: 26,
  ezek: 26,
  eze: 26,
  daniel: 27,
  dan: 27,
  da: 27,
  hosea: 28,
  hos: 28,
  joel: 29,
  joe: 29,
  amos: 30,
  am: 30,
  obadiah: 31,
  obad: 31,
  ob: 31,
  jonah: 32,
  jon: 32,
  micah: 33,
  mic: 33,
  nahum: 34,
  nah: 34,
  habakkuk: 35,
  hab: 35,
  zephaniah: 36,
  zeph: 36,
  zep: 36,
  haggai: 37,
  hag: 37,
  zechariah: 38,
  zech: 38,
  zec: 38,
  malachi: 39,
  mal: 39,
  // New Testament
  matthew: 40,
  matt: 40,
  mt: 40,
  mark: 41,
  mk: 41,
  mr: 41,
  luke: 42,
  lk: 42,
  lu: 42,
  john: 43,
  jn: 43,
  joh: 43,
  acts: 44,
  act: 44,
  ac: 44,
  romans: 45,
  rom: 45,
  ro: 45,
  "1 corinthians": 46,
  "1cor": 46,
  "1co": 46,
  "2 corinthians": 47,
  "2cor": 47,
  "2co": 47,
  galatians: 48,
  gal: 48,
  ga: 48,
  ephesians: 49,
  eph: 49,
  philippians: 50,
  phil: 50,
  php: 50,
  colossians: 51,
  col: 51,
  "1 thessalonians": 52,
  "1thess": 52,
  "1th": 52,
  "2 thessalonians": 53,
  "2thess": 53,
  "2th": 53,
  "1 timothy": 54,
  "1tim": 54,
  "1ti": 54,
  "2 timothy": 55,
  "2tim": 55,
  "2ti": 55,
  titus: 56,
  tit: 56,
  philemon: 57,
  phlm: 57,
  phm: 57,
  hebrews: 58,
  heb: 58,
  james: 59,
  jas: 59,
  "1 peter": 60,
  "1pet": 60,
  "1pe": 60,
  "2 peter": 61,
  "2pet": 61,
  "2pe": 61,
  "1 john": 62,
  "1jn": 62,
  "1jo": 62,
  "2 john": 63,
  "2jn": 63,
  "2jo": 63,
  "3 john": 64,
  "3jn": 64,
  "3jo": 64,
  jude: 65,
  jud: 65,
  revelation: 66,
  rev: 66,
  re: 66,
};

interface BibleRef {
  book: number;
  chapterStart: number;
  chapterEnd?: number;
  verseStart?: number;
  verseEnd?: number;
}

/**
 * Parse a human-readable Bible reference into numeric book/chapter/verse params.
 * Supports formats like: "John 3:16", "Genesis 1:1-3", "Matthew 5-7", "Ps 23"
 */
function parseBibleRef(input: string): BibleRef {
  const trimmed = input.trim();

  // Match: optional "1/2/3 " prefix + book name + optional chapter + optional verse range
  // e.g. "1 Corinthians 13:1-13", "John 3:16", "Genesis 1", "Ps 23:1-6"
  const match = trimmed.match(
    /^(\d\s+)?([A-Za-z ]+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?(?:-(\d+))?$/
  );

  if (!match) {
    throw new Error(
      `Could not parse Bible reference '${input}'. Try a format like "John 3:16" or "Genesis 1:1-3".`
    );
  }

  const prefix = (match[1] ?? "").trim(); // "1", "2", "3" (for numbered books)
  const rawBook = match[2].trim();
  const bookKey = (prefix ? `${prefix} ${rawBook}` : rawBook).toLowerCase();
  const bookNum = BIBLE_BOOK_MAP[bookKey];

  if (!bookNum) {
    throw new Error(
      `Unknown Bible book '${prefix ? prefix + " " : ""}${rawBook}'. Please check the book name.`
    );
  }

  const chapterStart = parseInt(match[3], 10);
  const verseStart = match[4] ? parseInt(match[4], 10) : undefined;
  const verseEndInChapter = match[5] ? parseInt(match[5], 10) : undefined;
  const chapterEnd = match[6] ? parseInt(match[6], 10) : undefined; // chapter range "5-7"

  return {
    book: bookNum,
    chapterStart,
    chapterEnd,
    verseStart,
    verseEnd: verseEndInChapter,
  };
}

export default function command(): WSlashCommand {
  return {
    name: "bible",
    description: "Load a verse from the Bible",
    options: [
      {
        name: "verse",
        description: "Verse reference (e.g., John 3:16, Genesis 1:1-3)",
        required: true,
        type: ApplicationCommandOptionType.String,
      },
      {
        name: "translation",
        description: "Choose a specific translation",
        type: ApplicationCommandOptionType.String,
        choices: [
          {
            name: "ASV – American Standard Version",
            value: "asv",
          },
          {
            name: "BBE – Bible in Basic English",
            value: "bbe",
          },
          {
            name: "KJV – King James Version",
            value: "kjv",
          },
          {
            name: "WEB – World English Bible",
            value: "web",
          },
          {
            name: "SCT – Submitters Community Translation",
            value: "sct",
          },
        ],
      },
    ],
    execute: async (interaction) => {
      const verse = interaction.options.get("verse", true).value as string;
      const translation =
        (interaction.options.get("translation")?.value as string | undefined) ||
        "sct";

      if (translation === "sct") {
        // --- ws-backend path ---
        try {
          const ref = parseBibleRef(verse);
          const response = await wsApi.getBible({
            book: ref.book,
            chapter_start: ref.chapterStart,
            chapter_end: ref.chapterEnd,
            verse_start: ref.verseStart,
            verse_end: ref.verseEnd,
            langs: ["en"],
          });

          const bookData = response.books?.[0];
          const chapters = bookData?.chapters ?? [];

          if (chapters.length === 0) {
            await interaction.reply({
              content: `\`Verse '${verse}' not found\``,
              flags: ["Ephemeral"],
            });
            return;
          }

          // Flatten all verses across chapters into a single display
          const allVerses = chapters.flatMap((ch) =>
            (ch.verses ?? []).map((v) => ({
              chapterNum: ch.cn ?? ref.chapterStart,
              verseNum: v.vn ?? 0,
              text: v.tr?.["en"]?.tx ?? "",
            }))
          );

          const formattedText =
            allVerses.length > 1
              ? allVerses
                  .map((v) => `**[${v.verseNum}]** ${v.text}`)
                  .join("\n\n")
              : (allVerses[0]?.text ?? "");

          const titleChapter =
            chapters.length === 1
              ? `${bookData?.bk} ${chapters[0].cn}`
              : `${bookData?.bk} ${ref.chapterStart}–${chapters[chapters.length - 1].cn}`;

          const embed = new EmbedBuilder()
            .setColor("DarkButNotBlack")
            .setTitle(titleChapter)
            .setDescription(
              formattedText.replace(/[`]/g, "'").substring(0, 4000)
            )
            .setFooter({
              text: `Bible • Submitters Community Translation`,
            });

          await interaction.reply({ embeds: [embed] });
        } catch (error: any) {
          await interaction.reply({
            content: `\`${error.message || `Verse '${verse}' not found`}\``,
            flags: ["Ephemeral"],
          });
        }
      } else {
        // --- Existing bible-api.com path (unchanged) ---
        try {
          const response = await fetch(
            `https://bible-api.com/${encodeURIComponent(verse)}?translation=${translation}`
          );

          if (!response.ok) {
            throw new Error("Failed to fetch Bible verse");
          }

          const data = await response.json();

          let formattedText = data.text;
          if (data.verses && data.verses.length > 1) {
            formattedText = data.verses
              .filter((i: { text: string }) => i.text !== "\n")
              .map(
                (verse: { verse: string; text: string }) =>
                  `**[${verse.verse}]** ${verse.text}`
              )
              .join("\n\n");
          }

          const embed = new EmbedBuilder()
            .setColor("DarkButNotBlack")
            .setTitle(`${data.reference}`)
            .setDescription(
              formattedText.replace(/[`]/g, "'").substring(0, 4000)
            )
            .setFooter({
              text: `Bible • ${data.translation_name}${data?.verses?.[0]?.book_name ? ` • ${data.verses[0].book_name}` : ""}`,
            });

          await interaction.reply({ embeds: [embed] });
        } catch (error) {
          await interaction.reply({
            content: `\`Verse '${verse}' not found\``,
            flags: ["Ephemeral"],
          });
        }
      }
    },
  };
}
