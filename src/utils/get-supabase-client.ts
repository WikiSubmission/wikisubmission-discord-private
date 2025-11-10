import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/generated/database.types';

export function getSupabaseClient() {
  return createClient<Database, "internal">(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'internal'
      }
    }
  );
}
