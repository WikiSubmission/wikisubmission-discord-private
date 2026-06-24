import { WEventListener } from "../types/w-event-listener";
import { getChannel } from "../utils/get-channel";
import { logError } from "../utils/log-error";
import { buildBulkDeleteEmbed } from "../utils/build-message-log-embed";

export default function listener(): WEventListener {
  return {
    name: "messageDeleteBulk",
    handler: async (messages, channel) => {
      try {
        // [Drop bot-authored messages (uncached ones have no author and are
        //  kept so mass deletions are still surfaced)]
        const relevant = messages.filter((message) => !message.author?.bot);
        if (relevant.size === 0) return;

        const messageLogs = getChannel("message-logs", "text", channel.guild);
        if (!messageLogs?.isTextBased()) return;

        // [Don't log activity happening inside the log channel itself]
        if (channel.id === messageLogs.id) return;

        await messageLogs.send({
          embeds: [buildBulkDeleteEmbed(relevant, channel.id)],
        });
      } catch (error) {
        logError(error, __filename);
      }
    },
  };
}
