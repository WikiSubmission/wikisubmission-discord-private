const CUSTOM_DELETE_EMOJI_NAME = "del";
const UNICODE_DELETE_EMOJIS = new Set(["🗑️", "🗑", "❌"]);

/**
 * A reaction counts as a delete request when it is the custom `:del:` emoji
 * (from any guild, matched by name) or one of the unicode fallbacks, which
 * keeps this working in guilds that never uploaded `:del:`.
 */
export function isDeleteReaction(emoji: {
  name: string | null;
  id: string | null;
}): boolean {
  if (emoji.id) {
    return emoji.name?.toLowerCase() === CUSTOM_DELETE_EMOJI_NAME;
  }
  return UNICODE_DELETE_EMOJIS.has(emoji.name ?? "");
}
