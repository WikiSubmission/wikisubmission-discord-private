import { Json } from "../types/generated/database.types";
import { getSupabaseInternalClient } from "./get-supabase-client";
import { logError } from "./log-error";

export type ModerationAction = "timeout" | "jail" | "ban" | "kick";

interface RecordModerationParams {
  guildId: string;
  userId: string;
  userName: string;
  action: ModerationAction;
  reason?: string | null;
  moderatorId?: string | null;
  moderatorName?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Persists a single moderation event (timeout / jail / ban / kick) so it can be
 * surfaced later via /history. Failures are logged but never thrown, so logging
 * can never block the underlying moderation action.
 */
export async function recordModeration(
  params: RecordModerationParams
): Promise<void> {
  try {
    const { error } = await getSupabaseInternalClient()
      .from("ws_discord_moderation_logs")
      .insert({
        guild_id: params.guildId,
        user_id: params.userId,
        user_name: params.userName || "--",
        action: params.action,
        reason: params.reason ?? null,
        moderator_id: params.moderatorId ?? null,
        moderator_name: params.moderatorName ?? null,
        metadata: (params.metadata ?? null) as Json,
      });

    if (error) {
      logError(error, __filename);
    }
  } catch (error) {
    logError(error, __filename);
  }
}
