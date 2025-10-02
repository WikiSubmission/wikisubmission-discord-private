import { WEventListener } from "../types/w-event-listener";
import { logError } from "../utils/log-error";
import {
  TextChannel,
  NewsChannel,
  StageChannel,
  VoiceChannel,
  PublicThreadChannel,
  PrivateThreadChannel,
  ChannelType,
  DMChannel,
  PartialDMChannel
} from "discord.js";

const SLOWMODE_ROLE_ID = "1423388115858489456"; // 🔹 delete+warning slowmode
const BLOCKMODE_ROLE_ID = "1423395870933647504"; // 🔹 permission block slowmode
const SLOWMODE_SECONDS = 10; // 🔹 adjust duration

// Cache to track last message timestamps
const lastMessageTimestamps = new Map<string, number>();
// Track users locked with permission overwrites
const lockedUsers = new Set<string>();

export default function listener(): WEventListener {
  return {
    name: "messageCreate",
    handler: async (message) => {
      try {
        if (message.author.bot) return;
        if (!message.guild || !message.member) return;

        const member = message.member;
        const now = Date.now();
        const last = lastMessageTimestamps.get(member.id) ?? 0;
        const diff = (now - last) / 1000;

        // Mode 1: Delete + warning (SLOWMODE_ROLE_ID)
        if (member.roles.cache.has(SLOWMODE_ROLE_ID)) {
          if (diff < SLOWMODE_SECONDS) {
            await message.delete().catch(() => {});

            const warning = await message.channel.send({
              content: `${member}, you must wait **${Math.ceil(
                SLOWMODE_SECONDS - diff
              )}s** before sending another message.`,
            });

            setTimeout(() => {
              warning.delete().catch(() => {});
            }, 5000);
            return;
          }

          lastMessageTimestamps.set(member.id, now);
          return;
        }

        // Mode 2: Permission block (BLOCKMODE_ROLE_ID)
        if (member.roles.cache.has(BLOCKMODE_ROLE_ID)) {
          if (diff < SLOWMODE_SECONDS) {
            await message.delete().catch(() => {});

            // Only apply permission overwrites for channels that support it
            if (
              message.channel instanceof TextChannel ||
              message.channel instanceof NewsChannel ||
              message.channel instanceof StageChannel ||
              message.channel instanceof VoiceChannel ||
              !(message.channel instanceof DMChannel)
            
            ) {
              if (!lockedUsers.has(member.id)) {
                lockedUsers.add(member.id);

                await message.channel.permissionOverwrites
                  .edit(member.id, { SendMessages: false })
                  .catch(() => {});

                setTimeout(async () => {
                  await message.channel.permissionOverwrites
                    .delete(member.id)
                    .catch(() => {});
                  lockedUsers.delete(member.id);
                }, SLOWMODE_SECONDS * 1000);
              }
            }
            return;
          }

          lastMessageTimestamps.set(member.id, now);
          return;
        }

        // Others → no slowmode
      } catch (err) {
        logError(err, __filename);
      }
    },
  };
}