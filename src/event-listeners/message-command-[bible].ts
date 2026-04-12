import { EmbedBuilder } from "discord.js";
import { WEventListener } from "../types/w-event-listener";
import { wsApi } from "../utils/ws-api";
import { logError } from "../utils/log-error";

const TRANSLATION_CODES = ["asv", "bbe", "kjv", "web", "sct"] as const;
type Translation = (typeof TRANSLATION_CODES)[number];

const TRANSLATION_LABELS: Record<string, string> = {
  asv: "American Standard Version",
  bbe: "Bible in Basic English",
  kjv: "King James Version",
  web: "World English Bible",
  sct: "Submitters Community Translation",
};

// Book name / common abbreviation → book number (1-based, matches ws-backend)
const BIBLE_BOOK_MAP: Record<string, number> = {
  // Old Testament
  genesis: 1, gen: 1, ge: 1,
  exodus: 2, exod: 2, ex: 2,
  leviticus: 3, lev: 3, le: 3,
  numbers: 4, num: 4, nu: 4,
  deuteronomy: 5, deut: 5, dt: 5,
  joshua: 6, josh: 6, jos: 6,
  judges: 7, judg: 7, jdg: 7,
  ruth: 8, rut: 8,
  "1 samuel": 9, "1sam": 9, "1sa": 9,
  "2 samuel": 10, "2sam": 10, "2sa": 10,
  "1 kings": 11, "1kgs": 11, "1ki": 11,
  "2 kings": 12, "2kgs": 12, "2ki": 12,
  "1 chronicles": 13, "1chr": 13, "1ch": 13,
  "2 chronicles": 14, "2chr": 14, "2ch": 14,
  ezra: 15, ezr: 15,
  nehemiah: 16, neh: 16,
  esther: 17, esth: 17, est: 17,
  job: 18, jb: 18,
  psalms: 19, psalm: 19, ps: 19, psa: 19,
  proverbs: 20, prov: 20, pr: 20,
  ecclesiastes: 21, eccl: 21, ec: 21,
  "song of solomon": 22, "song of songs": 22, song: 22, sos: 22, ss: 22,
  isaiah: 23, isa: 23,
  jeremiah: 24, jer: 24,
  lamentations: 25, lam: 25,
  ezekiel: 26, ezek: 26, eze: 26,
  daniel: 27, dan: 27, da: 27,
  hosea: 28, hos: 28,
  joel: 29, joe: 29,
  amos: 30, am: 30,
  obadiah: 31, obad: 31, ob: 31,
  jonah: 32, jon: 32,
  micah: 33, mic: 33,
  nahum: 34, nah: 34,
  habakkuk: 35, hab: 35,
  zephaniah: 36, zeph: 36, zep: 36,
  haggai: 37, hag: 37,
  zechariah: 38, zech: 38, zec: 38,
  malachi: 39, mal: 39,
  // New Testament
  matthew: 40, matt: 40, mt: 40,
  mark: 41, mk: 41, mr: 41,
  luke: 42, lk: 42, lu: 42,
  john: 43, jn: 43, joh: 43,
  acts: 44, act: 44, ac: 44,
  romans: 45, rom: 45, ro: 45,
  "1 corinthians": 46, "1cor": 46, "1co": 46,
  "2 corinthians": 47, "2cor": 47, "2co": 47,
  galatians: 48, gal: 48, ga: 48,
  ephesians: 49, eph: 49,
  philippians: 50, phil: 50, php: 50,
  colossians: 51, col: 51,
  "1 thessalonians": 52, "1thess": 52, "1th": 52,
  "2 thessalonians": 53, "2thess": 53, "2th": 53,
  "1 timothy": 54, "1tim": 54, "1ti": 54,
  "2 timothy": 55, "2tim": 55, "2ti": 55,
  titus: 56, tit: 56,
  philemon: 57, phlm: 57, phm: 57,
  hebrews: 58, heb: 58,
  james: 59, jas: 59,
  "1 peter": 60, "1pet": 60, "1pe": 60,
  "2 peter": 61, "2pet": 61, "2pe": 61,
  "1 john": 62, "1jn": 62, "1jo": 62,
  "2 john": 63, "2jn": 63, "2jo": 63,
  "3 john": 64, "3jn": 64, "3jo": 64,
  jude: 65, jud: 65,
  revelation: 66, rev: 66, re: 66,
};

// Canonical display names for bible-api.com queries
const CANONICAL_NAMES: Record<number, string> = {
  1: "Genesis", 2: "Exodus", 3: "Leviticus", 4: "Numbers", 5: "Deuteronomy",
  6: "Joshua", 7: "Judges", 8: "Ruth", 9: "1 Samuel", 10: "2 Samuel",
  11: "1 Kings", 12: "2 Kings", 13: "1 Chronicles", 14: "2 Chronicles",
  15: "Ezra", 16: "Nehemiah", 17: "Esther", 18: "Job", 19: "Psalms",
  20: "Proverbs", 21: "Ecclesiastes", 22: "Song of Solomon", 23: "Isaiah",
  24: "Jeremiah", 25: "Lamentations", 26: "Ezekiel", 27: "Daniel",
  28: "Hosea", 29: "Joel", 30: "Amos", 31: "Obadiah", 32: "Jonah",
  33: "Micah", 34: "Nahum", 35: "Habakkuk", 36: "Zephaniah", 37: "Haggai",
  38: "Zechariah", 39: "Malachi", 40: "Matthew", 41: "Mark", 42: "Luke",
  43: "John", 44: "Acts", 45: "Romans", 46: "1 Corinthians", 47: "2 Corinthians",
  48: "Galatians", 49: "Ephesians", 50: "Philippians", 51: "Colossians",
  52: "1 Thessalonians", 53: "2 Thessalonians", 54: "1 Timothy", 55: "2 Timothy",
  56: "Titus", 57: "Philemon", 58: "Hebrews", 59: "James", 60: "1 Peter",
  61: "2 Peter", 62: "1 John", 63: "2 John", 64: "3 John", 65: "Jude",
  66: "Revelation",
};

interface BibleRef {
  bookNumber: number;
  chapterStart: number;
  chapterEnd?: number;
  verseStart?: number;
  verseEnd?: number;
  translation: Translation;
}

/**
 * Detect a Bible reference anywhere in a message.
 * Supported formats:
 *   mark 1:4           → SCT (default)
 *   mark 1:4 kjv       → KJV (suffix)
 *   kjv mark 1:4       → KJV (prefix)
 *   genesis 1:1-3      → verse range
 *   1 corinthians 13:1 → numbered book
 *   john 3             → whole chapter
 */
function detectBibleRef(text: string): BibleRef | null {
  // Quick exit: must contain chapter:verse or at least chapter digits
  if (!/\d/.test(text)) return null;

  const lower = text.toLowerCase();

  // Extract translation code (prefix or suffix, case-insensitive)
  const transMatch = lower.match(/\b(asv|bbe|kjv|web|sct)\b/);
  const translation: Translation = transMatch
    ? (transMatch[1] as Translation)
    : "sct";

  // Remove translation code to simplify book+chapter parsing
  const clean = lower
    .replace(/\b(asv|bbe|kjv|web|sct)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Pattern: (optional digit prefix for numbered books) + (1-3 word book name)
  //          + chapter + optional(:verse(-verse)) + optional(-chapter for ranges)
  const match = clean.match(
    /(\d\s+)?([a-z]+(?:\s+[a-z]+){0,2})\s+(\d+)(?::(\d+)(?:-(\d+))?)?(?:-(\d+))?/
  );
  if (!match) return null;

  const prefix = (match[1] ?? "").trim();
  const rawBook = match[2].trim();
  const bookKey = prefix ? `${prefix} ${rawBook}` : rawBook;
  const bookNumber = BIBLE_BOOK_MAP[bookKey];

  if (!bookNumber) return null;

  return {
    bookNumber,
    chapterStart: parseInt(match[3], 10),
    chapterEnd: match[6] ? parseInt(match[6], 10) : undefined,
    verseStart: match[4] ? parseInt(match[4], 10) : undefined,
    verseEnd: match[5] ? parseInt(match[5], 10) : undefined,
    translation,
  };
}

export default function listener(): WEventListener {
  return {
    name: "messageCreate",
    handler: async (message) => {
      try {
        if (message.author.bot) return;

        const ref = detectBibleRef(message.content);
        if (!ref) return;

        await message.channel.sendTyping();

        if (ref.translation === "sct") {
          const response = await wsApi.getBible({
            book: ref.bookNumber,
            chapter_start: ref.chapterStart,
            chapter_end: ref.chapterEnd,
            verse_start: ref.verseStart,
            verse_end: ref.verseEnd,
            langs: ["en"],
          });

          const bookData = response.books?.[0];
          const chapters = bookData?.chapters ?? [];

          if (!chapters.length) {
            const msg = await message.reply(`\`Verse not found\``);
            setTimeout(() => msg.delete().catch(() => {}), 3000);
            return;
          }

          const allVerses = chapters.flatMap((ch) =>
            (ch.verses ?? []).map((v) => ({
              verseNum: v.vn ?? 0,
              text: v.tr?.["en"]?.tx ?? "",
            }))
          );

          const description =
            allVerses.length > 1
              ? allVerses
                  .map((v) => `**[${v.verseNum}]** ${v.text}`)
                  .join("\n\n")
              : (allVerses[0]?.text ?? "");

          const titleChapter =
            chapters.length === 1
              ? `${bookData?.bk} ${chapters[0].cn}`
              : `${bookData?.bk} ${ref.chapterStart}–${chapters[chapters.length - 1].cn}`;

          await message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("DarkButNotBlack")
                .setTitle(titleChapter)
                .setDescription(
                  description.replace(/[`]/g, "'").substring(0, 4000)
                )
                .setFooter({
                  text: `Bible • ${TRANSLATION_LABELS.sct}`,
                }),
            ],
          });
        } else {
          // bible-api.com for ASV / BBE / KJV / WEB
          const canonicalBook = CANONICAL_NAMES[ref.bookNumber];
          const verseQuery = ref.verseStart
            ? `${canonicalBook} ${ref.chapterStart}:${ref.verseStart}${ref.verseEnd ? `-${ref.verseEnd}` : ""}`
            : `${canonicalBook} ${ref.chapterStart}`;

          const response = await fetch(
            `https://bible-api.com/${encodeURIComponent(verseQuery)}?translation=${ref.translation}`
          );

          if (!response.ok) {
            const msg = await message.reply(`\`Verse not found\``);
            setTimeout(() => msg.delete().catch(() => {}), 3000);
            return;
          }

          const data = await response.json();

          let formattedText: string = data.text;
          if (data.verses && data.verses.length > 1) {
            formattedText = data.verses
              .filter((v: { text: string }) => v.text !== "\n")
              .map(
                (v: { verse: string; text: string }) =>
                  `**[${v.verse}]** ${v.text}`
              )
              .join("\n\n");
          }

          await message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("DarkButNotBlack")
                .setTitle(data.reference as string)
                .setDescription(
                  formattedText.replace(/[`]/g, "'").substring(0, 4000)
                )
                .setFooter({
                  text: `Bible • ${TRANSLATION_LABELS[ref.translation] ?? ref.translation.toUpperCase()}`,
                }),
            ],
          });
        }
      } catch (error) {
        logError(error, __filename);
      }
    },
  };
}
