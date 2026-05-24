import { AnyThreadChannel, EmbedBuilder, Message } from "discord.js";
import { getEnv } from "./get-env";

const HOUR_IN_MS = 60 * 60 * 1000;
const SUMMARY_AUTHOR_NAME = "SubmissionMod Thread Summary";
const SUMMARY_METADATA_PREFIX = "summary-meta:v1:";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const DEFAULT_TOPIC_GAP_HOURS = 8;
const DEFAULT_MAX_FETCH_MESSAGES = 300;
const DEFAULT_MAX_INPUT_MESSAGES = 80;
const DEFAULT_MAX_INPUT_TOKENS = 6000;
const DEFAULT_EXTRA_MESSAGES_LIMIT = 100;
const DEFAULT_MIN_NEW_MESSAGES_FOR_REFRESH = 10;
const DEFAULT_OUTPUT_MAX_TOKENS = 700;
const DEFAULT_RATE_LIMIT_DELAY_MS = 250;
const DEFAULT_GROQ_TIMEOUT_MS = 20_000;
const DEFAULT_GROQ_MAX_RETRIES = 2;
const DEFAULT_PER_MESSAGE_CHAR_LIMIT = 1200;
const DEFAULT_MIN_MESSAGES_BEFORE_GAP = 6;

export type SummaryMetadata = {
  version: 1;
  threadId: string;
  channelId: string;
  firstMessageId: string;
  lastMessageId: string;
  messageCount: number;
  estimatedInputTokens: number;
  createdAt: string;
};

type SummarySections = {
  summary: string;
  decisions: string[];
  action_items: string[];
  unresolved_questions: string[];
};

type SummaryRecord = {
  message: Message;
  metadata: SummaryMetadata;
  text: string;
};

type NormalizedMessage = {
  id: string;
  timestamp: string;
  author: string;
  content: string;
};

export type SummaryReuseResult = {
  kind: "reuse";
  summary: SummaryRecord;
  newMessageCount: number;
};

export type SummaryCreateResult = {
  kind: "create";
  messages: Message[];
  latestSummary: SummaryRecord | null;
  priorSummaryContext: string | null;
  newMessageCount: number;
  estimatedInputTokens: number;
  topicBoundaryHit: boolean;
  hardCapHit: boolean;
};

export type SummaryPlan = SummaryReuseResult | SummaryCreateResult;

function readNumberEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) return fallback;

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function readBoundedInteger(value: number | null | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

export const SUMMARY_CONFIG = {
  topicGapHours: readNumberEnv("SUMMARY_TOPIC_GAP_HOURS", DEFAULT_TOPIC_GAP_HOURS),
  maxFetchMessages: readNumberEnv("SUMMARY_MAX_FETCH_MESSAGES", DEFAULT_MAX_FETCH_MESSAGES),
  maxInputMessages: readNumberEnv("SUMMARY_MAX_INPUT_MESSAGES", DEFAULT_MAX_INPUT_MESSAGES),
  maxInputTokens: readNumberEnv("SUMMARY_MAX_INPUT_TOKENS", DEFAULT_MAX_INPUT_TOKENS),
  extraMessagesLimit: readNumberEnv("SUMMARY_EXTRA_MESSAGES_LIMIT", DEFAULT_EXTRA_MESSAGES_LIMIT),
  minNewMessagesForRefresh: readNumberEnv(
    "SUMMARY_MIN_NEW_MESSAGES_FOR_REFRESH",
    DEFAULT_MIN_NEW_MESSAGES_FOR_REFRESH
  ),
  outputMaxTokens: readNumberEnv("SUMMARY_OUTPUT_MAX_TOKENS", DEFAULT_OUTPUT_MAX_TOKENS),
  rateLimitDelayMs: readNumberEnv("SUMMARY_RATE_LIMIT_DELAY_MS", DEFAULT_RATE_LIMIT_DELAY_MS),
  groqTimeoutMs: readNumberEnv("SUMMARY_GROQ_TIMEOUT_MS", DEFAULT_GROQ_TIMEOUT_MS),
  groqMaxRetries: readNumberEnv("SUMMARY_GROQ_MAX_RETRIES", DEFAULT_GROQ_MAX_RETRIES),
  perMessageCharLimit: readNumberEnv(
    "SUMMARY_PER_MESSAGE_CHAR_LIMIT",
    DEFAULT_PER_MESSAGE_CHAR_LIMIT
  ),
  minMessagesBeforeGap: readNumberEnv(
    "SUMMARY_MIN_MESSAGES_BEFORE_GAP",
    DEFAULT_MIN_MESSAGES_BEFORE_GAP
  ),
};

export function isThreadSummaryMessage(
  message: Message,
  threadId: string,
  botUserId: string
): SummaryRecord | null {
  if (message.author.id !== botUserId) {
    return null;
  }

  const firstEmbed = message.embeds[0];
  const footerText = firstEmbed?.footer?.text;
  if (!footerText || !footerText.startsWith(SUMMARY_METADATA_PREFIX)) {
    return null;
  }

  const encodedMetadata = footerText.slice(SUMMARY_METADATA_PREFIX.length);

  try {
    const parsedMetadata = JSON.parse(
      Buffer.from(encodedMetadata, "base64url").toString("utf8")
    ) as SummaryMetadata;

    if (
      parsedMetadata.version !== 1 ||
      parsedMetadata.threadId !== threadId ||
      parsedMetadata.channelId !== message.channelId ||
      !parsedMetadata.lastMessageId
    ) {
      return null;
    }

    return {
      message,
      metadata: parsedMetadata,
      text: extractSummaryText(message),
    };
  } catch {
    return null;
  }
}

export async function planThreadSummary(
  thread: AnyThreadChannel,
  botUserId: string,
  extraMessages: number | null | undefined
): Promise<SummaryPlan> {
  const requestedExtraMessages = Math.min(
    readBoundedInteger(extraMessages, 0),
    SUMMARY_CONFIG.extraMessagesLimit
  );
  const maxInputMessages = Math.min(
    SUMMARY_CONFIG.maxInputMessages + requestedExtraMessages,
    SUMMARY_CONFIG.maxFetchMessages
  );

  let beforeMessageId: string | undefined;
  let fetchedMessages = 0;
  let estimatedInputTokens = 0;
  let hardCapHit = false;
  let topicBoundaryHit = false;
  let latestSummary: SummaryRecord | null = null;
  let lastKeptMessage: Message | null = null;
  const collectedMessages: Message[] = [];

  while (fetchedMessages < SUMMARY_CONFIG.maxFetchMessages) {
    const remaining = SUMMARY_CONFIG.maxFetchMessages - fetchedMessages;
    const batch = await thread.messages.fetch({
      limit: Math.min(100, remaining),
      before: beforeMessageId,
    });

    if (batch.size === 0) {
      break;
    }

    const pageMessages = [...batch.values()].sort(
      (left, right) => right.createdTimestamp - left.createdTimestamp
    );
    fetchedMessages += pageMessages.length;

    for (const message of pageMessages) {
      const summaryMessage = isThreadSummaryMessage(message, thread.id, botUserId);
      if (summaryMessage) {
        latestSummary = summaryMessage;
        break;
      }

      if (shouldSkipMessage(message)) {
        continue;
      }

      if (lastKeptMessage) {
        const timeGap =
          (lastKeptMessage.createdTimestamp - message.createdTimestamp) / HOUR_IN_MS;
        if (
          collectedMessages.length >= SUMMARY_CONFIG.minMessagesBeforeGap &&
          timeGap >= SUMMARY_CONFIG.topicGapHours
        ) {
          topicBoundaryHit = true;
          break;
        }
      }

      const normalizedMessage = normalizeMessage(message);
      collectedMessages.push(message);
      estimatedInputTokens += estimateTokens(normalizedMessage.content);
      lastKeptMessage = message;

      if (
        collectedMessages.length >= maxInputMessages ||
        estimatedInputTokens >= SUMMARY_CONFIG.maxInputTokens
      ) {
        hardCapHit = true;
        break;
      }
    }

    if (latestSummary || hardCapHit || topicBoundaryHit) {
      break;
    }

    beforeMessageId = pageMessages[pageMessages.length - 1]?.id;
    if (pageMessages.length < 100) {
      break;
    }

    if (SUMMARY_CONFIG.rateLimitDelayMs > 0) {
      await wait(SUMMARY_CONFIG.rateLimitDelayMs);
    }
  }

  if (
    latestSummary &&
    collectedMessages.length < SUMMARY_CONFIG.minNewMessagesForRefresh
  ) {
    return {
      kind: "reuse",
      summary: latestSummary,
      newMessageCount: collectedMessages.length,
    };
  }

  const chronologicalMessages = collectedMessages.sort(
    (left, right) => left.createdTimestamp - right.createdTimestamp
  );

  return {
    kind: "create",
    messages: chronologicalMessages,
    latestSummary,
    priorSummaryContext: latestSummary?.text ?? null,
    newMessageCount: collectedMessages.length,
    estimatedInputTokens,
    topicBoundaryHit,
    hardCapHit,
  };
}

export async function createThreadSummary(
  thread: AnyThreadChannel,
  sourceMessages: Message[],
  options: {
    focus?: string | null;
    priorSummaryContext?: string | null;
  }
): Promise<{
  embed: EmbedBuilder;
  metadata: SummaryMetadata;
  usageSummary: string;
}> {
  if (sourceMessages.length === 0) {
    throw new Error("No messages available to summarize.");
  }

  const normalizedMessages = sourceMessages.map(normalizeMessage);
  const estimatedInputTokens = estimateTokens(
    normalizedMessages.map((message) => message.content).join("\n")
  );
  const summarySections = await requestGroqSummary(normalizedMessages, {
    focus: options.focus ?? null,
    priorSummaryContext: options.priorSummaryContext ?? null,
  });

  const metadata: SummaryMetadata = {
    version: 1,
    threadId: thread.id,
    channelId: thread.id,
    firstMessageId: sourceMessages[0].id,
    lastMessageId: sourceMessages[sourceMessages.length - 1].id,
    messageCount: sourceMessages.length,
    estimatedInputTokens,
    createdAt: new Date().toISOString(),
  };

  const embed = buildSummaryEmbed(thread.name, summarySections, metadata);
  const usageSummary = [
    `summarized ${sourceMessages.length} message(s)`,
    estimatedInputTokens > 0
      ? `estimated input ${estimatedInputTokens} token(s)`
      : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    embed,
    metadata,
    usageSummary,
  };
}

export function getSummaryJumpUrl(message: Message): string {
  const guildId = message.guildId || "@me";
  return `https://discord.com/channels/${guildId}/${message.channelId}/${message.id}`;
}

export function buildReuseResponse(summary: SummaryRecord, newMessageCount: number) {
  const summaryUrl = getSummaryJumpUrl(summary.message);
  const newMessagesLabel = `${newMessageCount} new message${
    newMessageCount === 1 ? "" : "s"
  }`;
  return `Reusing the latest summary because only ${newMessagesLabel} arrived since it was posted. ${summaryUrl}`;
}

function buildSummaryEmbed(
  threadName: string,
  summarySections: SummarySections,
  metadata: SummaryMetadata
): EmbedBuilder {
  const encodedMetadata = Buffer.from(JSON.stringify(metadata), "utf8").toString(
    "base64url"
  );

  const embed = new EmbedBuilder()
    .setAuthor({ name: SUMMARY_AUTHOR_NAME })
    .setTitle(`Summary for ${threadName}`)
    .setColor(0x00bcd4)
    .setDescription(trimText(summarySections.summary, 4000))
    .setFooter({ text: `${SUMMARY_METADATA_PREFIX}${encodedMetadata}` })
    .setTimestamp(Date.now());

  if (summarySections.decisions.length > 0) {
    embed.addFields({
      name: "Key decisions",
      value: trimText(asBulletList(summarySections.decisions), 1024),
    });
  }

  if (summarySections.action_items.length > 0) {
    embed.addFields({
      name: "Action items",
      value: trimText(asBulletList(summarySections.action_items), 1024),
    });
  }

  if (summarySections.unresolved_questions.length > 0) {
    embed.addFields({
      name: "Unresolved questions",
      value: trimText(asBulletList(summarySections.unresolved_questions), 1024),
    });
  }

  return embed;
}

async function requestGroqSummary(
  messages: NormalizedMessage[],
  options: {
    focus?: string | null;
    priorSummaryContext?: string | null;
  }
): Promise<SummarySections> {
  const groqApiKey = getEnv("GROQ_API_KEY");
  const promptPayload = messages.map((message) => message.content).join("\n\n");

  const systemPrompt = [
    "You summarize Discord threads.",
    "Use only the provided conversation and prior summary context.",
    "Return strict JSON with keys: summary, decisions, action_items, unresolved_questions.",
    "summary must be a concise paragraph.",
    "decisions, action_items, unresolved_questions must each be arrays of short strings.",
    "If a section is empty, return an empty array.",
    "The output must be standalone and understandable without the raw thread.",
  ].join(" ");

  const userPromptParts = [
    options.focus ? `Focus: ${options.focus}` : null,
    options.priorSummaryContext
      ? `Prior summary context:\n${options.priorSummaryContext}`
      : null,
    `Thread messages:\n${promptPayload}`,
  ].filter(Boolean);

  const requestBody = {
    model: DEFAULT_GROQ_MODEL,
    temperature: 0.2,
    max_tokens: SUMMARY_CONFIG.outputMaxTokens,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPromptParts.join("\n\n"),
      },
    ],
  };

  for (let attempt = 0; attempt <= SUMMARY_CONFIG.groqMaxRetries; attempt += 1) {
    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      SUMMARY_CONFIG.groqTimeoutMs
    );

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (response.status === 429 && attempt < SUMMARY_CONFIG.groqMaxRetries) {
        await wait((attempt + 1) * 1000);
        continue;
      }

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Groq request failed with ${response.status}: ${responseText}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Groq returned an empty response.");
      }

      return parseSummarySections(content);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Groq rate-limited every retry attempt.");
}

function parseSummarySections(content: string): SummarySections {
  const trimmedContent = content.trim();
  const jsonBlock = trimmedContent.startsWith("{")
    ? trimmedContent
    : trimmedContent.slice(
        trimmedContent.indexOf("{"),
        trimmedContent.lastIndexOf("}") + 1
      );
  const parsed = JSON.parse(jsonBlock) as Partial<SummarySections>;

  return {
    summary: trimText(parsed.summary || "No summary generated.", 4000),
    decisions: sanitizeItems(parsed.decisions),
    action_items: sanitizeItems(parsed.action_items),
    unresolved_questions: sanitizeItems(parsed.unresolved_questions),
  };
}

function sanitizeItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? trimText(item, 300) : null))
    .filter((item): item is string => Boolean(item));
}

function shouldSkipMessage(message: Message): boolean {
  if (message.system) {
    return true;
  }

  return !message.content && message.attachments.size === 0;
}

function normalizeMessage(message: Message): NormalizedMessage {
  const attachmentLines = message.attachments.map((attachment) => attachment.url);
  const replyTarget = message.reference?.messageId
    ? `Replying to message ${message.reference.messageId}`
    : null;
  const rawContent = [message.content.trim(), replyTarget, ...attachmentLines]
    .filter(Boolean)
    .join("\n");
  const authorName = message.member?.displayName || message.author.username;
  const normalizedContent = trimText(
    rawContent || "[No text content]",
    SUMMARY_CONFIG.perMessageCharLimit
  );

  return {
    id: message.id,
    timestamp: new Date(message.createdTimestamp).toISOString(),
    author: authorName,
    content: [
      `[${new Date(message.createdTimestamp).toISOString()}] ${authorName}`,
      normalizedContent,
    ].join("\n"),
  };
}

function extractSummaryText(message: Message): string {
  const lines: string[] = [];
  const firstEmbed = message.embeds[0];

  if (firstEmbed?.description) {
    lines.push(firstEmbed.description);
  }

  for (const field of firstEmbed?.fields || []) {
    lines.push(`${field.name}: ${field.value}`);
  }

  return lines.join("\n\n").trim();
}

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

function trimText(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  return `${content.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function asBulletList(items: string[]): string {
  return items.map((item) => `• ${item}`).join("\n");
}

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
