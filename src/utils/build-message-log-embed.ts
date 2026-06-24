import {
  Collection,
  EmbedBuilder,
  Message,
  PartialMessage,
  Snowflake,
} from "discord.js";
import { stringifyName } from "./stringify-name";

type AnyMessage = Message | PartialMessage;

// [Discord embed limits]
const FIELD_VALUE_LIMIT = 1024;
const DESCRIPTION_LIMIT = 4096;
const BULK_LINE_LIMIT = 20;

/**
 * Truncate text to fit within a Discord embed limit, appending an ellipsis when
 * the original was longer. Returns an empty string for nullish input.
 */
export function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/**
 * Render the author of a (possibly uncached) message. Falls back to a marker
 * when the message arrived as a partial without a resolved author.
 */
function describeAuthor(message: AnyMessage): string {
  if (message.author) {
    return stringifyName(message.author);
  }
  return "`Unknown (uncached)`";
}

/**
 * Format a message's attachments as markdown links. Note that Discord CDN URLs
 * for deleted attachments expire shortly after deletion.
 */
function describeAttachments(message: AnyMessage): string | null {
  if (message.attachments.size === 0) return null;
  const lines = message.attachments.map(
    (attachment) => `[${attachment.name ?? "attachment"}](${attachment.url})`
  );
  return truncate(lines.join("\n"), FIELD_VALUE_LIMIT);
}

const NO_CONTENT_DELETED = "*[content unavailable — message was not cached]*";
const NO_CONTENT_ORIGINAL = "*[original content unavailable — not cached]*";
const EMPTY_CONTENT = "*[no text content]*";

/**
 * Embed for a single deleted message.
 */
export function buildDeleteEmbed(message: AnyMessage): EmbedBuilder {
  const content = message.content
    ? truncate(message.content, FIELD_VALUE_LIMIT)
    : message.partial
      ? NO_CONTENT_DELETED
      : EMPTY_CONTENT;

  const embed = new EmbedBuilder()
    .setTitle("🗑️ Message Deleted")
    .setColor("DarkRed")
    .addFields(
      { name: "Author", value: describeAuthor(message) },
      { name: "Channel", value: `<#${message.channelId}>` },
      { name: "Content", value: content }
    )
    .setTimestamp(Date.now());

  const attachments = describeAttachments(message);
  if (attachments) {
    embed.addFields({ name: "Attachments", value: attachments });
  }

  embed.setFooter({ text: `Message ID: ${message.id}` });

  return embed;
}

/**
 * Embed for an edited message, showing before and after content.
 */
export function buildEditEmbed(
  oldMessage: AnyMessage,
  newMessage: AnyMessage
): EmbedBuilder {
  const before = oldMessage.content
    ? truncate(oldMessage.content, FIELD_VALUE_LIMIT)
    : oldMessage.partial
      ? NO_CONTENT_ORIGINAL
      : EMPTY_CONTENT;

  const after = newMessage.content
    ? truncate(newMessage.content, FIELD_VALUE_LIMIT)
    : EMPTY_CONTENT;

  return new EmbedBuilder()
    .setTitle("✏️ Message Edited")
    .setColor("Gold")
    .setURL(newMessage.url)
    .addFields(
      { name: "Author", value: describeAuthor(newMessage) },
      { name: "Channel", value: `<#${newMessage.channelId}>` },
      { name: "Before", value: before },
      { name: "After", value: after },
      { name: "Jump", value: `[Go to message](${newMessage.url})` }
    )
    .setFooter({ text: `Message ID: ${newMessage.id}` })
    .setTimestamp(Date.now());
}

/**
 * Summary embed for a bulk message deletion (e.g. a purge). Lists up to
 * BULK_LINE_LIMIT messages, noting how many more were omitted.
 */
export function buildBulkDeleteEmbed(
  messages: Collection<Snowflake, AnyMessage>,
  channelId: string
): EmbedBuilder {
  const ordered = [...messages.values()].sort(
    (a, b) => (a.createdTimestamp ?? 0) - (b.createdTimestamp ?? 0)
  );

  const shown = ordered.slice(0, BULK_LINE_LIMIT);
  const lines = shown.map((message) => {
    const author = message.author
      ? message.author.username
      : "Unknown (uncached)";
    const snippet = message.content
      ? truncate(message.content, 120)
      : message.partial
        ? "[uncached]"
        : "[no text content]";
    return `**${author}:** ${snippet}`;
  });

  const remaining = ordered.length - shown.length;
  if (remaining > 0) {
    lines.push(`*…and ${remaining} more message(s)*`);
  }

  return new EmbedBuilder()
    .setTitle("🧹 Bulk Message Deletion")
    .setColor("DarkRed")
    .setDescription(truncate(lines.join("\n"), DESCRIPTION_LIMIT))
    .addFields(
      { name: "Channel", value: `<#${channelId}>`, inline: true },
      { name: "Messages Deleted", value: `${messages.size}`, inline: true }
    )
    .setTimestamp(Date.now());
}
