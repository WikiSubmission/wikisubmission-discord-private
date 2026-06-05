-- Moderation history log.
-- Records every timeout / jail / ban / kick so /history can report a user's
-- recent moderation activity. Run this once against the Supabase project
-- (schema: internal).

create table if not exists internal.ws_discord_moderation_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  guild_id text not null,
  user_id text not null,
  user_name text not null default '--',
  action text not null check (action in ('timeout', 'jail', 'ban', 'kick')),
  reason text,
  moderator_id text,
  moderator_name text,
  metadata jsonb
);

-- Optimises the /history lookup: most recent actions for a given user in a guild.
create index if not exists ws_discord_moderation_logs_lookup_idx
  on internal.ws_discord_moderation_logs (guild_id, user_id, created_at desc);
