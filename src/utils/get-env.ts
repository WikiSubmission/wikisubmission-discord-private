export function getEnv(
  secret: `DISCORD_TOKEN_${string}` | `DISCORD_CLIENTID_${string}`
): string {
  if (process.env[secret]) {
    return process.env[secret];
  } else {
    console.log(`No environment variable: ${secret}. Crashing.`);
    process.exit(1);
  }
}
