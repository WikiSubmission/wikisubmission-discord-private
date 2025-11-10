import { GuildMember, PartialGuildMember } from "discord.js";
import { getSupabaseClient } from "./get-supabase-client";
import { logError } from "./log-error";

export async function syncMember(
  context: GuildMember | PartialGuildMember | null,
  trigger?: string
) {
  try {
    if (!context || !("user" in context) || !("guild" in context)) return;

    const roleIds =
      context.roles?.cache
        ?.filter((role) => role.name !== "@everyone")
        ?.map((role) => role.id) || [];

    await getSupabaseClient()
      .from("ws_discord_members")
      .upsert({
        id: `${context.user.id}*${context.guild.id}`,
        user_id: context.user.id,
        user_name: context.user.username,
        display_name: context.user.displayName || context.user.username || "--",
        guild_id: context.guild.id,
        joined_timestamp: Date.now(),
        created_timestamp: context.user.createdTimestamp,
        avatar_url: context.user.displayAvatarURL(),
        roles: roleIds.join(","),
      });

    console.log(
      `[Member Sync] ${context.user.username} (${context.user.displayName})${trigger ? ` [Trigger: ${trigger}]` : ""}`
    );
  } catch (error) {
    logError(error, __filename);
  }
}
