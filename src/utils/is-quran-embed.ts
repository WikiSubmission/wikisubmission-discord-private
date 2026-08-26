import { Message, PartialMessage } from "discord.js";

const QURAN_FOOTER = "Quran: The Final Testament";

/**
 * Quran results are identified by their footer, which every Quran embed shares
 * (optionally suffixed with a page counter).
 */
export function isQuranEmbed(message: Message | PartialMessage): boolean {
  return message.embeds.some((embed) =>
    embed.footer?.text?.startsWith(QURAN_FOOTER) ?? false
  );
}
