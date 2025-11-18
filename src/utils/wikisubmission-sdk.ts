import { WikiSubmission } from "wikisubmission-sdk";

export const ws = WikiSubmission.createClient({
  endpointUrl: process.env.BYPASS_CLOUDFLARE_PROXY_URL || undefined, // (emergency case: use the original supabase URL from env)
  enableLogging: true,
});
