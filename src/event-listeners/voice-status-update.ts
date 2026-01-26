import { WEventListener } from "../types/w-event-listener";
import {
  PermissionsBitField,
  GuildMember,
  GuildTextBasedChannel,
} from "discord.js";
import { logError } from "../utils/log-error";
import { getChannel } from "../utils/get-channel";
import { getRole } from "../utils/get-role";

export default function listener(): WEventListener {
  return {
    name: "voiceStateUpdate",
    handler: async (previousState, newState) => {
      try {
        const botMember = newState.guild.members.me;
        const member = newState.member;

        if (!member || member.user.bot) return;

        const inVcRole = getRole("IN VC", newState.guild);

        if (
          previousState.channel?.name.startsWith("Jail") ||
          newState.channel?.name.startsWith("Jail") ||
          previousState.channel?.name.startsWith("Verify") ||
          newState.channel?.name.startsWith("Verify")
        ) {
          if (inVcRole && member.roles.cache.has(inVcRole.id)) {
            await member.roles.remove(inVcRole?.id);
          }
          return;
        }

        // === VC Role Handling ===
        if (inVcRole) {
          const communityRole = getRole("Community", newState.guild);
          if (!communityRole || !member.roles.cache.has(communityRole.id)) {
            const oldChannel = previousState.channel;
            const newChannel = newState.channel;

            if (!oldChannel && newChannel) {
              // Joined VC → add role
              await member.roles.add(inVcRole).catch(console.error);
            } else if (oldChannel && !newChannel) {
              // Left VC → remove role
              await member.roles.remove(inVcRole).catch(console.error);
            }
          }
        }

        // === VC Logging ===
        if (previousState.channelId === null && newState.channelId !== null) {
          const vc_logs = getChannel("vc-logs", "text", newState);
          if (vc_logs && canSendMessages(vc_logs, botMember)) {
            await vc_logs.send(
              `**${member.displayName}** has joined <#${newState.channelId}>.`
            );
          }
        }

        if (previousState.channelId !== null && newState.channelId === null) {
          const vc_logs = getChannel("vc-logs", "text", previousState);
          if (vc_logs && canSendMessages(vc_logs, botMember)) {
            await vc_logs.send(
              `\`${member.displayName}\` has left <#${previousState.channelId}>.`
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

  const permissions = channel.permissionsFor(botMember);
  if (!permissions) return false;

  return permissions.has([
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ViewChannel,
  ]);
}
