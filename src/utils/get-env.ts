export function getEnv(secret: string): string {
  if (process.env[secret]) {
    return process.env[secret];
  } else {
    console.log(`No environment variable: ${secret}. Crashing.`);
    process.exit(1);
  }
}
