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
        const jail = getRole("Jail", newState.guild);
        if (!inVcRole) return;
        if (!jail) return;

        const newChannel = newState.channel;
        const isInRestrictedChannel =
          newChannel?.name.startsWith("Jail") ||
          newChannel?.name.startsWith("Verify");

        const shouldHaveRole =
          newChannel !== null &&
          !isInRestrictedChannel &&
          member.roles.cache.has(jail.id);

        if (shouldHaveRole) {
          if (!member.roles.cache.has(inVcRole.id)) {
            await member.roles.add(inVcRole).catch(console.error);
          }
        } else {
          if (member.roles.cache.has(inVcRole.id)) {
            await member.roles.remove(inVcRole).catch(console.error);
          }
        }

        // === VC Logging ===
        const vc_logs = getChannel("vc-logs", "text", newState.guild); // Simplified lookup
        if (vc_logs && canSendMessages(vc_logs, botMember)) {
          if (!previousState.channelId && newState.channelId) {
            await vc_logs.send(
              `**${member.displayName}** joined <#${newState.channelId}>.`
            );
          } else if (previousState.channelId && !newState.channelId) {
            await vc_logs.send(
              `\`${member.displayName}\` left <#${previousState.channelId}>.`
            );
          } else if (previousState.channelId !== newState.channelId) {
            await vc_logs.send(
              `**${member.displayName}** moved: <#${previousState.channelId}> ➔ <#${newState.channelId}>.`
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
