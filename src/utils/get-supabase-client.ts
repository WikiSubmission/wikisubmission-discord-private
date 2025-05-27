import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/generated/database.types';

export function getSupabaseClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_API_KEY!,
  );
}
