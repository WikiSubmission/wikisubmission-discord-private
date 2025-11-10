import { EmbedBuilder } from "discord.js";
import { WEventListener } from "../types/w-event-listener";
import { getChannel } from "../utils/get-channel";
import { logError } from "../utils/log-error";

export default function listener(): WEventListener {
  return {
    name: "guildScheduledEventCreate",
    handler: async (scheduledEvent) => {
      console.log(
        `Event "${scheduledEvent.name}" (${scheduledEvent.channel?.name || scheduledEvent.channelId}) created by ${scheduledEvent.creator?.username || scheduledEvent.creatorId}.`
      );

      try {
        // [Send alert]
        const staffLog = getChannel("staff-log", "text", scheduledEvent);
        if (!staffLog) {
          console.warn(`Staff log channel not found`);
          return;
        }

        await staffLog.send({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: `An event was created`,
                iconURL: scheduledEvent.guild?.iconURL() || undefined,
              })
              .addFields(
                {
                  name: "Title",
                  value: `[${scheduledEvent.name}](https://discord.com/events/${scheduledEvent.guildId}/${scheduledEvent.id})`,
                },
                {
                  name: "Channel",
                  value: `<#${scheduledEvent.channelId || "--"}>`,
                }
              )
              .setFooter({
                text:
                  scheduledEvent.creatorId === scheduledEvent.client.user?.id
                    ? `/event`
                    : `${scheduledEvent.creator?.username || scheduledEvent.id}`,
                iconURL: scheduledEvent.creator?.displayAvatarURL(),
              })
              .setColor("DarkBlue")
              .setTimestamp(new Date()),
          ],
        });
      } catch (error) {
        logError(error, __filename);
      }
    },
  };
}
