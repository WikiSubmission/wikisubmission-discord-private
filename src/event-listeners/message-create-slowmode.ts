import { WEventListener } from "../types/w-event-listener";
import { logError } from "../utils/log-error";

const SLOWMODE_ROLE_ID = "1423388115858489456"; // 🔹 replace with your role ID
const SLOWMODE_SECONDS = 3; // 🔹 adjust how long slowmode lasts

// Cache to track last message timestamps
const lastMessageTimestamps = new Map<string, number>();

export default function listener(): WEventListener {
  return {
    name: "messageCreate",
    handler: async (message) => {
      try {
        if (message.author.bot) return;
        if (!message.guild || !message.member) return;

        const member = message.member;

        // Only apply to the one role
        if (!member.roles.cache.has(SLOWMODE_ROLE_ID)) {
          return; // everyone else = no slowmode
        }

        const now = Date.now();
        const last = lastMessageTimestamps.get(member.id) ?? 0;
        const diff = (now - last) / 1000;

        if (diff < SLOWMODE_SECONDS) {
          // too soon → delete message
          await message.delete().catch(() => {});

          // ephemeral-like warning (auto-delete after 5s)
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

        // update timestamp
        lastMessageTimestamps.set(member.id, now);
      } catch (err) {
        logError(err, __filename);
      }
    },
  };
}
