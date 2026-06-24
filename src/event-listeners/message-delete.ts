import { WEventListener } from "../types/w-event-listener";
import { getChannel } from "../utils/get-channel";
import { logError } from "../utils/log-error";
import { buildDeleteEmbed } from "../utils/build-message-log-embed";

export default function listener(): WEventListener {
  return {
    name: "messageDelete",
    handler: async (message) => {
      try {
        // [Only log guild messages]
        if (!message.guild) return;

        // [Skip bot-authored messages (also prevents re-logging our own logs).
        //  A null author means the message was uncached; we still log it.]
        if (message.author?.bot) return;

        const messageLogs = getChannel("message-logs", "text", message.guild);
        if (!messageLogs?.isTextBased()) return;

        // [Don't log activity happening inside the log channel itself]
        if (message.channelId === messageLogs.id) return;

        await messageLogs.send({ embeds: [buildDeleteEmbed(message)] });
      } catch (error) {
        logError(error, __filename);
      }
    },
  };
}
