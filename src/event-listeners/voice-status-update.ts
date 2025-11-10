import { WEventListener } from "../types/w-event-listener";
import {
  PermissionsBitField,
  GuildMember,
  GuildTextBasedChannel,
} from "discord.js";
import { logError } from "../utils/log-error";
import { getChannel } from "../utils/get-channel";

export default function listener(): WEventListener {
  return {
    name: "voiceStateUpdate",
    handler: async (previousState, newState) => {
      try {
        const botMember = newState.guild.members.me;

        // [VC Joined]
        if (previousState.channelId === null && newState.channelId !== null) {
          const vc_logs = getChannel("vc-logs", "text", newState);
          if (vc_logs && canSendMessages(vc_logs, botMember)) {
            await vc_logs.send(
              `**${newState.member?.displayName}** has joined <#${newState.channelId}>.`
            );
          }
        }

        // [VC Left]
        if (previousState.channelId !== null && newState.channelId === null) {
          const vc_logs = getChannel("vc-logs", "text", previousState);
          if (vc_logs && canSendMessages(vc_logs, botMember)) {
            await vc_logs.send(
              `\`${newState.member?.displayName}\` has left <#${previousState.channelId}>.`
            );
          }
        }
      } catch (error) {
        logError(error, __filename);
      }
    },
  };
}

function canSendMessages(
  channel: GuildTextBasedChannel | null | undefined,
  botMember: GuildMember | null
): boolean {
  if (!channel || !botMember) return false;

  // Get bot's permissions in the channel
  const permissions = channel.permissionsFor(botMember);
  if (!permissions) return false;

  // Check for both SendMessages and ViewChannel permissions
  return permissions.has([
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ViewChannel,
  ]);
}
