-- Named markers.
-- Simple key/value notes managed via /marker (set / get / list / delete).
-- Each marker has a unique name and a free-form string content.
-- Run this once against the Supabase project (schema: internal).

create table if not exists internal.ws_discord_markers (
  name text primary key,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  author_id text,
  author_name text
);

-- Orders the /marker list output by most recently updated first.
create index if not exists ws_discord_markers_updated_idx
  on internal.ws_discord_markers (updated_at desc);
