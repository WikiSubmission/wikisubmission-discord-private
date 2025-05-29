import { Bot } from '../bot/client';
import { SupportedGuilds } from '../constants/supported-guilds';
import { ScheduledTaskManager } from '../utils/discord/create-scheduled-action';
import { getSupabaseClient } from '../utils/get-supabase-client';
import { logError } from '../utils/log-error';


export default function action(): ScheduledTaskManager {
  return new ScheduledTaskManager({
    id: 'DAILY_MEMBER_SYNC',
    description: 'Syncs necessary member data',
    interval: 'EVERY_DAY',
    action: async () => {
      try {
        const guild = await Bot.client.guilds.fetch(
          process.env.NODE_ENV === 'production'
            ? SupportedGuilds.Production.id
            : SupportedGuilds.Development.id,
        );

        const members = await guild.members.fetch();
        const now = Date.now();

        const rows = Array.from(members.values()).map((member) => {
          const rolesString = member.roles.cache
            .filter((role) => role.name !== '@everyone')
            .map((role) => role.id)
            .join(',');

          return {
            id: `${member.user.id}*${member.guild.id}`,
            user_id: member.user.id,
            user_name: member.user.username,
            display_name: member.displayName || member.user.username || '--',
            guild_id: member.guild.id,
            joined_timestamp: now,
            created_timestamp: member.user.createdTimestamp,
            avatar_url: member.user.displayAvatarURL(),
            roles: rolesString,
          };
        });

        const BATCH_SIZE = 200;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const chunk = rows.slice(i, i + BATCH_SIZE);
          await getSupabaseClient()
            .from('DiscordMembers')
            .upsert(chunk, { onConflict: 'id' });
        }
      } catch (error) {
        logError(error, 'hourly-member-sync');
      }
    },
  });
}
