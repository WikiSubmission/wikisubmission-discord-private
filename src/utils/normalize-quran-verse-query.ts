export function normalizeQuranVerseQuery(input: string): string {
  return input
    .trim()
    .replace(/[‐‑‒–—―−]/g, "-")
    // Strips optional prefixes like q, eq, beq (up to 3 letters) followed by digits
    .replace(/^[a-z]{1,3}\s*(?=\d)/i, "")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*,\s*/g, ",")
    // Converts "3 3" to "3:3"
    .replace(/(^|,)(\d{1,3})\s+(\d{1,3})(?=$|[-,])/g, "$1$2:$3");
}
