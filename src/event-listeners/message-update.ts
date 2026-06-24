import { WEventListener } from "../types/w-event-listener";
import { getChannel } from "../utils/get-channel";
import { logError } from "../utils/log-error";
import { buildEditEmbed } from "../utils/build-message-log-embed";

export default function listener(): WEventListener {
  return {
    name: "messageUpdate",
    handler: async (oldMessage, newMessage) => {
      try {
        // [Only log guild messages]
        if (!newMessage.guild) return;

        // [Skip bot-authored messages]
        if (newMessage.author?.bot) return;

        // [Skip when the new message is itself a partial (rare, on gateway
        //  resume) — we cannot reliably compare content, so don't false-log]
        if (newMessage.partial) return;

        // [Resolve the original message if it arrived as a partial]
        if (oldMessage.partial) {
          oldMessage = await oldMessage.fetch().catch((error) => {
            logError(error, __filename);
            return oldMessage;
          });
        }

        // [Skip non-content edits (link previews, pins, embeds loading). When
        //  the original is still a partial we cannot compare, so we log it.]
        if (!oldMessage.partial && oldMessage.content === newMessage.content) {
          return;
        }

        const messageLogs = getChannel(
          "message-logs",
          "text",
          newMessage.guild
        );
        if (!messageLogs?.isTextBased()) return;

        // [Don't log activity happening inside the log channel itself]
        if (newMessage.channelId === messageLogs.id) return;

        await messageLogs.send({
          embeds: [buildEditEmbed(oldMessage, newMessage)],
        });
      } catch (error) {
        logError(error, __filename);
      }
    },
  };
}
