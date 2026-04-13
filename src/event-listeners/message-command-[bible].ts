import { EmbedBuilder } from "discord.js";
import { WEventListener } from "../types/w-event-listener";
import { wsApi } from "../utils/ws-api";
import { logError } from "../utils/log-error";
import { stimulateDelay } from "../utils/stimulate-delay";

// ─── Translation registry ─────────────────────────────────────────────────────

const TRANSLATION_CODES = [
  "sct",
  "kjv",
  "asv",
  "bbe",
  "web",
  "webbe",
  "ylt",
  "dra",
  "darby",
  "oeb-us",
  "oeb-cw",
  "nrsvue",
] as const;
type Translation = (typeof TRANSLATION_CODES)[number];

const TRANSLATION_LABELS: Record<Translation, string> = {
  sct: "Submitters Community Translation",
  kjv: "King James Version",
  asv: "American Standard Version",
  bbe: "Bible in Basic English",
  web: "World English Bible",
  webbe: "World English Bible (British Edition)",
  ylt: "Young's Literal Translation",
  dra: "Douay-Rheims 1899",
  darby: "Darby Bible",
  "oeb-us": "Open English Bible (US Edition)",
  "oeb-cw": "Open English Bible (Commonwealth Edition)",
  nrsvue: "New Revised Standard Version Updated",
};

// API.Bible configuration for NRSVue
const API_BIBLE_KEY = process.env.API_BIBLE_KEY;
const NRSVUE_BIBLE_ID = "8509845dc5e4f1ea-01";

// ─── Book maps ────────────────────────────────────────────────────────────────

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

const CANONICAL_NAMES: Record<number, string> = {
  1: "Genesis",
  2: "Exodus",
  3: "Leviticus",
  4: "Numbers",
  5: "Deuteronomy",
  6: "Joshua",
  7: "Judges",
  8: "Ruth",
  9: "1 Samuel",
  10: "2 Samuel",
  11: "1 Kings",
  12: "2 Kings",
  13: "1 Chronicles",
  14: "2 Chronicles",
  15: "Ezra",
  16: "Nehemiah",
  17: "Esther",
  18: "Job",
  19: "Psalms",
  20: "Proverbs",
  21: "Ecclesiastes",
  22: "Song of Solomon",
  23: "Isaiah",
  24: "Jeremiah",
  25: "Lamentations",
  26: "Ezekiel",
  27: "Daniel",
  28: "Hosea",
  29: "Joel",
  30: "Amos",
  31: "Obadiah",
  32: "Jonah",
  33: "Micah",
  34: "Nahum",
  35: "Habakkuk",
  36: "Zephaniah",
  37: "Haggai",
  38: "Zechariah",
  39: "Malachi",
  40: "Matthew",
  41: "Mark",
  42: "Luke",
  43: "John",
  44: "Acts",
  45: "Romans",
  46: "1 Corinthians",
  47: "2 Corinthians",
  48: "Galatians",
  49: "Ephesians",
  50: "Philippians",
  51: "Colossians",
  52: "1 Thessalonians",
  53: "2 Thessalonians",
  54: "1 Timothy",
  55: "2 Timothy",
  56: "Titus",
  57: "Philemon",
  58: "Hebrews",
  59: "James",
  60: "1 Peter",
  61: "2 Peter",
  62: "1 John",
  63: "2 John",
  64: "3 John",
  65: "Jude",
  66: "Revelation",
};

// Books 1–39 = OT, 40–66 = NT
function testament(bookNumber: number): "OT" | "NT" {
  return bookNumber <= 39 ? "OT" : "NT";
}

// ─── API.Bible book abbreviations (for NRSVue passage IDs) ───────────────────

const API_BIBLE_BOOK_IDS: Record<number, string> = {
  1: "GEN",
  2: "EXO",
  3: "LEV",
  4: "NUM",
  5: "DEU",
  6: "JOS",
  7: "JDG",
  8: "RUT",
  9: "1SA",
  10: "2SA",
  11: "1KI",
  12: "2KI",
  13: "1CH",
  14: "2CH",
  15: "EZR",
  16: "NEH",
  17: "EST",
  18: "JOB",
  19: "PSA",
  20: "PRO",
  21: "ECC",
  22: "SNG",
  23: "ISA",
  24: "JER",
  25: "LAM",
  26: "EZK",
  27: "DAN",
  28: "HOS",
  29: "JOL",
  30: "AMO",
  31: "OBA",
  32: "JON",
  33: "MIC",
  34: "NAM",
  35: "HAB",
  36: "ZEP",
  37: "HAG",
  38: "ZEC",
  39: "MAL",
  40: "MAT",
  41: "MRK",
  42: "LUK",
  43: "JHN",
  44: "ACT",
  45: "ROM",
  46: "1CO",
  47: "2CO",
  48: "GAL",
  49: "EPH",
  50: "PHP",
  51: "COL",
  52: "1TH",
  53: "2TH",
  54: "1TI",
  55: "2TI",
  56: "TIT",
  57: "PHM",
  58: "HEB",
  59: "JAS",
  60: "1PE",
  61: "2PE",
  62: "1JN",
  63: "2JN",
  64: "3JN",
  65: "JUD",
  66: "REV",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface BibleRef {
  bookNumber: number;
  chapterStart: number;
  chapterEnd?: number;
  verseStart?: number;
  verseEnd?: number;
}

/** A group of refs sharing the same book + chapterStart */
interface RefGroup {
  bookNumber: number;
  chapterStart: number;
  // individual verse numbers requested (undefined = whole chapter)
  verseNumbers: number[] | undefined;
  translation: Translation;
}

// ─── Detection ────────────────────────────────────────────────────────────────

const TRANS_RE =
  /\b(sct|kjv|asv|bbe|web|webbe|ylt|dra|darby|oeb-us|oeb-cw|nrsvue)\b/gi;

// Matches: (optional digit prefix) (1-3 word book) (chapter) optional(:verse(-verse))
const REF_RE =
  /(\d\s+)?([a-z]+(?:\s+[a-z]+){0,2})\s+(\d+)(?::(\d+)(?:-(\d+))?)?/gi;

/**
 * Detect all Bible references in a message.
 * Supports:
 *   mark 1:4             john 3:16 kjv
 *   kjv genesis 1:1-3    1 corinthians 13:1
 *   matthew 5:20\nmatthew 7:12\nmatthew 7:17
 */
function detectAllBibleRefs(text: string): {
  refs: BibleRef[];
  translation: Translation;
} {
  // Extract translation once — applies to all refs in message
  const transMatch = text.match(TRANS_RE);
  const translation: Translation = transMatch
    ? (transMatch[0].toLowerCase() as Translation)
    : "nrsvue";

  const clean = text.replace(TRANS_RE, "").replace(/\s+/g, " ").trim();

  const refs: BibleRef[] = [];
  const seen = new Set<string>();

  for (const match of clean.matchAll(REF_RE)) {
    const prefix = (match[1] ?? "").trim();
    const rawBook = match[2].trim();
    const bookKey = prefix ? `${prefix} ${rawBook}` : rawBook;
    const bookNumber = BIBLE_BOOK_MAP[bookKey.toLowerCase()];
    if (!bookNumber) continue;

    const chapterStart = parseInt(match[3], 10);
    const verseStart = match[4] ? parseInt(match[4], 10) : undefined;
    const verseEnd = match[5] ? parseInt(match[5], 10) : undefined;

    const key = `${bookNumber}:${chapterStart}:${verseStart ?? ""}:${verseEnd ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    refs.push({ bookNumber, chapterStart, verseStart, verseEnd });
  }

  return { refs, translation };
}

/** Group refs by book+chapter so we can batch them into one API call */
function groupRefs(refs: BibleRef[], translation: Translation): RefGroup[] {
  const map = new Map<string, RefGroup>();

  for (const ref of refs) {
    const key = `${ref.bookNumber}:${ref.chapterStart}`;
    if (!map.has(key)) {
      map.set(key, {
        bookNumber: ref.bookNumber,
        chapterStart: ref.chapterStart,
        verseNumbers: ref.verseStart !== undefined ? [] : undefined,
        translation,
      });
    }
    const group = map.get(key)!;
    if (ref.verseStart !== undefined && group.verseNumbers !== undefined) {
      // Expand verse ranges into individual numbers
      const end = ref.verseEnd ?? ref.verseStart;
      for (let v = ref.verseStart; v <= end; v++) {
        if (!group.verseNumbers.includes(v)) group.verseNumbers.push(v);
      }
    } else if (ref.verseStart === undefined) {
      // Whole chapter requested — clear the filter
      group.verseNumbers = undefined;
    }
  }

  // Sort verse numbers within each group
  for (const g of map.values()) {
    g.verseNumbers?.sort((a, b) => a - b);
  }

  return [...map.values()];
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Strip inline cross-references embedded in WEB/similar texts, e.g. "1:2 Malachi 3:1" */
function stripInlineCrossRefs(text: string): string {
  return text
    .replace(
      /\b\d{1,3}:\d{1,3}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+\d{1,3}:\d{1,3}\b/g,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Join verse objects into a paragraph-aware string.
 * Verse texts ending with \n signal a paragraph break.
 */
function joinVerses(
  verses: Array<{ verse: number | string; text: string }>
): string {
  let result = "";
  for (const v of verses) {
    const rawText = v.text;
    const cleaned = stripInlineCrossRefs(rawText.trimEnd());
    const chunk = `**[${v.verse}]** ${cleaned}`;
    if (!result) {
      result = chunk;
    } else {
      result +=
        rawText.trimEnd() !== rawText.trim() ? `\n\n${chunk}` : ` ${chunk}`;
    }
  }
  return result.trim();
}

/** Build a structured embed title: [NT] Mark · 1:1  or  [OT] Genesis · 1:1–3 */
function buildTitle(
  bookNumber: number,
  chapterStart: number,
  verseNumbers: number[] | undefined
): string {
  const t = testament(bookNumber);
  const book = CANONICAL_NAMES[bookNumber];
  let ref: string;
  if (!verseNumbers || verseNumbers.length === 0) {
    ref = `Chapter ${chapterStart}`;
  } else if (verseNumbers.length === 1) {
    ref = `${chapterStart}:${verseNumbers[0]}`;
  } else {
    ref = `${chapterStart}:${verseNumbers[0]}–${verseNumbers[verseNumbers.length - 1]}`;
  }
  return `[${t}] ${book}  ·  ${ref}`;
}

const SEPARATOR = "\n\n~~                               ~~";

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchSct(group: RefGroup): Promise<EmbedBuilder | null> {
  const verseNums = group.verseNumbers;
  const verseStart = verseNums ? Math.min(...verseNums) : undefined;
  const verseEnd = verseNums ? Math.max(...verseNums) : undefined;

  const response = await wsApi.getBible({
    book: group.bookNumber,
    chapter_start: group.chapterStart,
    verse_start: verseStart,
    verse_end: verseEnd ?? verseStart, // pin to avoid defaulting to end-of-chapter
    langs: ["en"],
  });

  const bookData = response.books?.[0];
  const chapters = bookData?.chapters ?? [];
  if (!chapters.length) return null;

  const rawVerses = chapters.flatMap((ch) =>
    (ch.verses ?? []).map((v) => ({
      verse: v.vn ?? 0,
      text: v.tr?.["en"]?.tx ?? "",
    }))
  );

  // Filter to only the requested verse numbers (if specific verses were asked)
  const filtered =
    verseNums && verseNums.length > 0
      ? rawVerses.filter((v) => verseNums.includes(v.verse as number))
      : rawVerses;

  if (!filtered.length) return null;

  const description = filtered
    .map((v) => `**[${v.verse}]** ${v.text.trim()}`)
    .join(" ");
  const title = buildTitle(
    group.bookNumber,
    group.chapterStart,
    group.verseNumbers
  );

  return new EmbedBuilder()
    .setColor("Purple")
    .setTitle(title)
    .setDescription(description.substring(0, 4000) + SEPARATOR)
    .setFooter({ text: `Bible  ·  ${TRANSLATION_LABELS.sct}` });
}

async function fetchBibleApi(
  group: RefGroup,
  translation: Exclude<Translation, "sct" | "nrsvue">
): Promise<EmbedBuilder | null> {
  const book = CANONICAL_NAMES[group.bookNumber];
  const verseNums = group.verseNumbers;

  let query: string;
  if (!verseNums || verseNums.length === 0) {
    query = `${book} ${group.chapterStart}`;
  } else if (verseNums.length === 1) {
    query = `${book} ${group.chapterStart}:${verseNums[0]}`;
  } else {
    query = `${book} ${group.chapterStart}:${verseNums[0]}-${verseNums[verseNums.length - 1]}`;
  }

  const res = await fetch(
    `https://bible-api.com/${encodeURIComponent(query)}?translation=${translation}`
  );
  if (!res.ok) return null;

  const data = await res.json();

  let verses: Array<{ verse: string | number; text: string }>;
  if (data.verses && data.verses.length > 1) {
    verses = (data.verses as Array<{ verse: number; text: string }>).filter(
      (v) => v.text !== "\n"
    );
  } else {
    verses = [{ verse: "", text: data.text as string }];
  }

  // Filter to only requested verse numbers when specific verses were asked
  if (verseNums && verseNums.length > 0 && data.verses?.length > 1) {
    verses = verses.filter((v) => verseNums.includes(Number(v.verse)));
  }

  if (!verses.length) return null;

  const description =
    verses.length === 1 && verses[0].verse === ""
      ? stripInlineCrossRefs(verses[0].text)
      : joinVerses(verses as Array<{ verse: number; text: string }>);

  const title = buildTitle(
    group.bookNumber,
    group.chapterStart,
    group.verseNumbers
  );

  return new EmbedBuilder()
    .setColor("Purple")
    .setTitle(title)
    .setDescription(description.substring(0, 4000) + SEPARATOR)
    .setFooter({ text: `Bible  ·  ${TRANSLATION_LABELS[translation]}` });
}

async function fetchNrsvue(group: RefGroup): Promise<EmbedBuilder | null> {
  if (!API_BIBLE_KEY) return null;

  const bookId = API_BIBLE_BOOK_IDS[group.bookNumber];
  const verseNums = group.verseNumbers;

  let passageId: string;
  if (!verseNums || verseNums.length === 0) {
    passageId = `${bookId}.${group.chapterStart}`;
  } else if (verseNums.length === 1) {
    passageId = `${bookId}.${group.chapterStart}.${verseNums[0]}`;
  } else {
    passageId = `${bookId}.${group.chapterStart}.${verseNums[0]}-${bookId}.${group.chapterStart}.${verseNums[verseNums.length - 1]}`;
  }

  const url = `https://api.scripture.api.bible/v1/bibles/${NRSVUE_BIBLE_ID}/passages/${encodeURIComponent(passageId)}?content-type=text&include-verse-numbers=true&include-titles=false`;
  const res = await fetch(url, {
    headers: { "api-key": API_BIBLE_KEY },
  });

  if (!res.ok) {
    logError(
      new Error(
        `NRSVue API.Bible error ${res.status} for passage "${passageId}"`
      ),
      __filename
    );
    return null;
  }

  const data = await res.json();
  const rawText: string = data?.data?.content ?? "";
  if (!rawText.trim()) return null;

  // API.Bible returns verse numbers as [1], [2] already — strip any cross-refs
  const cleaned = stripInlineCrossRefs(rawText.trim()).replace(/\s{2,}/g, " ");
  const title = buildTitle(
    group.bookNumber,
    group.chapterStart,
    group.verseNumbers
  );

  return new EmbedBuilder()
    .setColor("Purple")
    .setTitle(title)
    .setDescription(cleaned.substring(0, 4000) + SEPARATOR)
    .setFooter({ text: `Bible  ·  ${TRANSLATION_LABELS.nrsvue}` });
}

// ─── Access control ───────────────────────────────────────────────────────────

// Fill in Discord user IDs to enable the Bible command for those users only.
// Leave the array empty ([]) to disable completely.
const BIBLE_ALLOWED_USER_IDS: string[] = ["771800475410497576"];

// ─── Event listener ───────────────────────────────────────────────────────────

export default function listener(): WEventListener {
  return {
    name: "messageCreate",
    handler: async (message) => {
      try {
        if (message.author.bot) return;
        if (!BIBLE_ALLOWED_USER_IDS.includes(message.author.id)) return;

        const { refs, translation } = detectAllBibleRefs(message.content);
        if (!refs.length) return;

        await message.channel.sendTyping();

        const groups = groupRefs(refs, translation);

        for (const group of groups) {
          let embed: EmbedBuilder | null = null;

          try {
            if (translation === "sct") {
              embed = await fetchSct(group);
            } else if (translation === "nrsvue") {
              if (API_BIBLE_KEY) {
                embed = await fetchNrsvue(group);
              }
              // Fall back to KJV if NRSVue is unavailable or the API call failed
              if (!embed) {
                embed = await fetchBibleApi(group, "kjv");
              }
            } else {
              embed = await fetchBibleApi(
                group,
                translation as Exclude<Translation, "sct" | "nrsvue">
              );
            }
          } catch (fetchError) {
            logError(fetchError, __filename);
          }

          if (!embed) {
            const title = buildTitle(
              group.bookNumber,
              group.chapterStart,
              group.verseNumbers
            );
            const msg = await message.reply(`\`${title} — not found\``);
            setTimeout(() => msg.delete().catch(() => {}), 4000);
          } else {
            await message.reply({ embeds: [embed] });
          }

          await stimulateDelay(400);
        }
      } catch (error) {
        logError(error, __filename);
      }
    },
  };
}
