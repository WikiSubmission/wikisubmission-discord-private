import NodeCache from 'node-cache';
import { getSupabaseClient } from './get-supabase-client';

export const EnvCache = new NodeCache();

export async function getEnv(
  secret: `DISCORD_TOKEN_${string}` | `DISCORD_CLIENTID_${string}`,
  critical: boolean = true,
): Promise<string> {
  const cached = EnvCache.get(secret);
  if (cached) {
    return cached as string;
  }
  const client = getSupabaseClient();
  const request = await client
    .from('DiscordSecrets')
    .select('*')
    .eq('key', secret)
    .single();

  if (request.status === 200 && request.data?.value) {
    EnvCache.set(secret, request.data.value);
    return request.data.value;
  } else {
    if (process.env[secret]) {
      console.warn(
        `Failed to remotely fetch environment variable: ${secret} (${request.error?.message || '--'}). Returning from local .env file.`,
      );
      return process.env[secret];
    } else if (critical) {
      console.log(
        `Failed to remotely fetch environment variable: ${secret} (${request.error?.message || '--'}). Crashing.`,
      );
      process.exit(1);
    } else {
      console.warn(
        `Failed to remotely fetch environment variable: ${secret} (${request.error?.message || '--'}). Ensure available or store in .env file.`,
      );
      return '';
    }
  }
}
