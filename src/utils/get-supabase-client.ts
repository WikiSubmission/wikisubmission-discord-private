import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/generated/database.types";

export function getSupabaseInternalClient() {
  if (!process.env.SUPABASE_URL) return null;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!key) return null;

  return createClient<Database, "internal">(process.env.SUPABASE_URL, key, {
    db: {
      schema: "internal",
    },
  });
}
