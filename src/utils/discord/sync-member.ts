import { APIInteractionGuildMember, GuildMember, PartialGuildMember } from "discord.js";
import { getSupabaseClient } from "../get-supabase-client";
import { stringifyRoles } from "./stringify-roles";

export async function syncMember(context: GuildMember | PartialGuildMember | null) {
    if (context) {
        const rolesString = stringifyRoles(context);
        await getSupabaseClient()
            .from('DiscordMembers')
            .upsert({
                id: `${context.user.id}*${context.guild.id}`,
                user_id: context.user.id,
                user_name: context.user.username,
                display_name: context.user.displayName || context.user.username || '--',
                guild_id: context.guild.id,
                joined_timestamp: Date.now(),
                created_timestamp: context.user.createdTimestamp,
                avatar_url: context.user.displayAvatarURL(),
                roles:
                    rolesString !== null
                        ? rolesString
                            .split(', ')
                            .map((r) => r.replace(/[<@&>]/g, ''))
                            .join(',')
                        : '',
            });
    }

}