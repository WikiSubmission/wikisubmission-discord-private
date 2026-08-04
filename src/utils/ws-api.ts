import type { components, operations } from "../api/types.gen";
import { stimulateDelay } from "./stimulate-delay";

const API_PREFIX = "/api/v1";

/**
 * Prefer the container-internal host (`http://ws-backend:8082`) in production.
 * Going out over the public hostname hairpins every request through DNS,
 * Cloudflare and traefik just to come back to the same machine, which is where
 * the intermittent "fetch failed" bursts come from.
 *
 * `API_BASE_URL` is the name the Coolify runbooks use, so accept both.
 */
function resolveBaseUrl(): string {
  const configured =
    process.env.WS_BACKEND_URL ??
    process.env.API_BASE_URL ??
    "https://ws-backend.wikisubmission.org/api/v1";

  const trimmed = configured.replace(/\/+$/, "");
  return trimmed.endsWith(API_PREFIX) ? trimmed : trimmed + API_PREFIX;
}

const BASE_URL = resolveBaseUrl();

/** A hung request must not leave the command silently pending forever. */
const REQUEST_TIMEOUT_MS = 8_000;
/**
 * Ceiling across all attempts. Retries are near-free when the failure is
 * immediate (DNS/TLS reject), but three consecutive timeouts would otherwise
 * keep a Discord user waiting ~24s with nothing on screen.
 */
const TOTAL_BUDGET_MS = 12_000;
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [250, 750];

type QuranResponse = components["schemas"]["QuranResponse"];
type BibleResponse = components["schemas"]["BibleResponse"];

/** Carries the status through so retry logic can tell 5xx from 4xx. */
class HttpStatusError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpStatusError";
    this.status = status;
  }
}

/**
 * Network-level failures (DNS, TLS, ECONNREFUSED, and undici reusing a
 * keep-alive socket the other side already closed) surface as a bare
 * `TypeError: fetch failed` with the real reason on `.cause`. Those are worth
 * one more try; an HTTP 404 is not.
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof HttpStatusError) {
    return error.status >= 500 || error.status === 429;
  }
  return error instanceof Error && error.name !== "SyntaxError";
}

async function attempt<T>(url: string, timeoutMs: number): Promise<T> {
  // AbortController rather than AbortSignal.timeout: this package targets ES6
  // and the static helper is not in the ambient lib here.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new HttpStatusError(
        res.status,
        (body as { message?: string }).message || `HTTP ${res.status}`
      );
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

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
  const target = url.toString();
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  let lastError: unknown;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      return await attempt<T>(target, Math.min(REQUEST_TIMEOUT_MS, remaining));
    } catch (error) {
      lastError = error;
      const isLast = i === MAX_ATTEMPTS - 1;
      if (isLast || !isRetryableError(error)) break;
      const backoff = RETRY_BACKOFF_MS[i] ?? 750;
      if (deadline - Date.now() <= backoff) break;
      await stimulateDelay(backoff);
    }
  }

  // Re-throw with the endpoint attached, keeping the original on `cause` so
  // logError can unwrap the underlying DNS/TLS/socket reason. Assigned rather
  // than passed to the constructor because ErrorOptions is not in the ES6 lib.
  const reason =
    lastError instanceof Error ? lastError.message : String(lastError);
  const wrapped = new Error(
    `ws-backend GET ${url.pathname} failed after ${MAX_ATTEMPTS} attempt(s): ${reason}`
  );
  (wrapped as Error & { cause?: unknown }).cause = lastError;
  throw wrapped;
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
