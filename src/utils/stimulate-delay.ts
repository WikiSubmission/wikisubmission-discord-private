export async function stimulateDelay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
