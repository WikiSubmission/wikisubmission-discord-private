import { EmbedBuilder } from "discord.js";
import { WEventListener } from "../types/w-event-listener";
import { getRole } from "../utils/get-role";
import { logError } from "../utils/log-error";

const lastMessageTimestamps = new Map<string, number>();
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

        const hushRole = getRole("Hush");
        const slowRole = getRole("Slow");
        if (!slowRole) return;
        if (!hushRole) {
          console.error("Cannot find Hush role. Please contact a dev");
          return;
        }

        const DISCORD_HUSH_DURATION_SECONDS = 10;

        // Function to send ephemeral-style warning
        async function sendWarning(content: string) {
          // Try DM first
          try {
            await member.send(content);
          } catch {
            // fallback: send temporary message in channel
            const warningMsg = await message.channel.send(content);
            setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
          }
        }

        // --- Slow Role ---
        if (member.roles.cache.has(slowRole.id)) {
          if (diff < DISCORD_HUSH_DURATION_SECONDS) {
            await message.delete().catch(() => {});
            await sendWarning(
              `${member}, you must wait **${Math.ceil(
                DISCORD_HUSH_DURATION_SECONDS - diff
              )}s** before sending another message.`
            );
            return;
          }

          lastMessageTimestamps.set(member.id, now);
          return;
        }

        // --- Hush Role ---
        if (member.roles.cache.has(hushRole.id)) {
          if (diff < DISCORD_HUSH_DURATION_SECONDS) {
            await message.delete().catch(() => {});
            await message.channel.send({
              content: `[${member}'s Message removed: You are hushed by moderation — wait 10s between messages]`,
            });
            if (
              "permissionOverwrites" in message.channel &&
              !lockedUsers.has(member.id)
            ) {
              lockedUsers.add(member.id);
              await message.channel.permissionOverwrites
                .edit(member.id, {
                  SendMessages: false,
                  CreatePublicThreads: false,
                  CreatePrivateThreads: false,
                  SendMessagesInThreads: false,
                })
                .catch(() => {});

              setTimeout(async () => {
                if ("permissionOverwrites" in message.channel) {
                  await message.channel.permissionOverwrites
                    .delete(member.id)
                    .catch(() => {});
                }
                lockedUsers.delete(member.id);
              }, DISCORD_HUSH_DURATION_SECONDS * 1000);
            }
          }

          lastMessageTimestamps.set(member.id, now);
          return;
        }
      } catch (err) {
        logError(err, __filename);
      }
    },
  };
}
