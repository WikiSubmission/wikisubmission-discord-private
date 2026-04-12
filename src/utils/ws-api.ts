import type { components, operations } from "../api/types.gen";

const BASE_URL =
  process.env.WS_BACKEND_URL ??
  "https://ws-backend.wikisubmission.org/api/v1";

type QuranResponse = components["schemas"]["QuranResponse"];
type BibleResponse = components["schemas"]["BibleResponse"];

async function get<T>(
  path: string,
  params: Record<string, string | string[] | number | boolean | undefined>
): Promise<T> {
  const url = new URL(BASE_URL + path);
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      for (const v of val) url.searchParams.append(key, String(v));
    } else {
      url.searchParams.set(key, String(val));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const wsApi = {
  async getQuran(
    params: operations["getQuran"]["parameters"]["query"]
  ): Promise<QuranResponse> {
    return get("/quran", params as Record<string, any>);
  },

  async searchQuran(
    params: NonNullable<operations["search"]["parameters"]["query"]>
  ): Promise<QuranResponse> {
    return get("/search", params as Record<string, any>);
  },

  async getBible(
    params: operations["getBible"]["parameters"]["query"]
  ): Promise<BibleResponse> {
    return get("/bible", params as Record<string, any>);
  },

  async searchBible(
    params: operations["searchBible"]["parameters"]["query"]
  ): Promise<BibleResponse> {
    return get("/bible/search", params as Record<string, any>);
  },
};

/**
 * Map the old SDK targetLanguage() string to ws-backend ISO language code(s).
 * Optionally appends "tl" (transliteration) when withTranslit is true.
 */
export function mapLangCodes(
  targetLang: string,
  withTranslit = false
): string[] {
  const map: Record<string, string[]> = {
    english: ["en"],
    arabic: ["ar"],
    englishAndArabic: ["en", "ar"],
    turkish: ["tr"],
    french: ["fr"],
    german: ["de"],
    bahasa: ["id"],
    persian: ["fa"],
    tamil: ["ta"],
    swedish: ["sv"],
    russian: ["ru"],
    bengali: ["bn"],
    urdu: ["ur"],
    spanish: ["es"],
  };
  const codes = map[targetLang] ?? ["en"];
  if (withTranslit && !codes.includes("tl")) {
    return [...codes, "tl"];
  }
  return codes;
}
