import { AuditLogEvent, Guild, Message, PartialMessage, User } from "discord.js";
import { logError } from "./log-error";
import { stimulateDelay } from "./stimulate-delay";

type AnyMessage = Message | PartialMessage;

/**
 * Who removed a message.
 *
 * - `user`     — an audit entry names an executor (a moderator, or this bot).
 * - `self`     — no audit entry applies, and Discord only omits one when the
 *                author removed their own message.
 * - `unknown`  — we genuinely cannot tell; `reason` says why.
 */
export type MessageDeleter =
  | { kind: "user"; user: User }
  | { kind: "self" }
  | { kind: "unknown"; reason: UnknownReason };

export type UnknownReason =
  // [The audit log could not be read at all — usually no ViewAuditLog]
  | "audit-log-unavailable"
  // [The message was uncached, so there is no author to match an entry against]
  | "uncached-author"
  // [An entry matches this author and channel, but we joined too late to tell
  //  whether it describes THIS deletion or an earlier one]
  | "inconclusive";

// [How long an audit entry may be stale before we stop trusting it on a first
//  sighting]
const RECENT_ENTRY_WINDOW_MS = 15_000;

// [Discord takes a moment to write the audit entry after the gateway event]
const AUDIT_LOG_DELAY_MS = 1500;

// [Remember how many deletions each audit entry had accounted for the last time
//  we saw it, and when. Discord folds repeated deletions by the same executor
//  against the same author in the same channel into ONE entry whose `count`
//  increments, so a stale-looking entry may still describe a brand new
//  deletion — only a rising count proves it. Conversely, an entry we have been
//  watching whose count did NOT move proves the opposite: no moderator acted,
//  so the author removed the message themselves.]
const seenCounts = new Map<string, { count: number; at: number }>();
const SEEN_TTL_MS = 10 * 60 * 1000;

function pruneSeen(now: number): void {
  for (const [id, seen] of seenCounts) {
    if (now - seen.at > SEEN_TTL_MS) seenCounts.delete(id);
  }
}

/**
 * Work out who deleted a message, from the guild audit log.
 *
 * Discord writes an audit entry only when someone *other than the author*
 * removed the message, so the absence of one is itself evidence of a
 * self-deletion — but only once the cases where we simply could not look
 * (no permission, uncached message, ambiguous aggregated entry) are ruled out.
 */
export async function resolveMessageDeleter(
  message: AnyMessage
): Promise<MessageDeleter> {
  const guild: Guild | null = message.guild;
  if (!guild) return { kind: "unknown", reason: "audit-log-unavailable" };

  // [Without a known author we cannot match the audit entry's target]
  if (!message.author) return { kind: "unknown", reason: "uncached-author" };

  try {
    await stimulateDelay(AUDIT_LOG_DELAY_MS);

    const auditLogs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MessageDelete,
      limit: 25,
    });

    const entry = auditLogs.entries.find(
      (candidate) =>
        candidate.target?.id === message.author?.id &&
        candidate.extra?.channel?.id === message.channelId
    );

    // [Nobody else has deleted this author's messages here recently, so this
    //  deletion produced no entry — the author did it themselves.]
    if (!entry) return { kind: "self" };

    const now = Date.now();
    pruneSeen(now);

    const count = entry.extra?.count ?? 1;
    const seen = seenCounts.get(entry.id);
    seenCounts.set(entry.id, { count, at: now });

    if (seen) {
      // [We have been watching this entry: a rising count is this deletion, a
      //  flat count means the entry predates it and the author self-deleted.]
      if (count <= seen.count) return { kind: "self" };
    } else if (now - entry.createdTimestamp > RECENT_ENTRY_WINDOW_MS) {
      // [First sighting of an already-old entry — it may have just been
      //  incremented by a moderator, or it may be unrelated history. Claiming
      //  either way would risk crediting a moderator's deletion to the author.]
      return { kind: "unknown", reason: "inconclusive" };
    }

    // [A partial executor is still a `User` at runtime, only narrower in type]
    const executor = entry.executor as User | null;
    if (!executor) return { kind: "unknown", reason: "inconclusive" };

    return { kind: "user", user: executor };
  } catch (error) {
    // [Most commonly a missing ViewAuditLog permission]
    logError(error, __filename);
    return { kind: "unknown", reason: "audit-log-unavailable" };
  }
}
