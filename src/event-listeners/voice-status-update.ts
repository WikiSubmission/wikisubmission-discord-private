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
        const guild = newState.guild;
        const botMember = guild.members.me;
        const member = newState.member;

        // 1. Basic Validation
        if (!member || member.user.bot) return;

        // 2. Resource Resolution & Logging
        const inVcRole = getRole("IN VC", guild);
        const jailRole = getRole("Jail", guild);
        const unverified = getRole("UNverified", guild);

        if (!inVcRole || !jailRole || !unverified) {
          console.warn(
            `[VC Update] Missing configuration in ${guild.name}: ${!inVcRole ? ' "IN VC" role' : ""}${!jailRole ? ' "Jail" role' : ""}`
          );
          return;
        }

        const newChannel = newState.channel;
        const oldChannel = previousState.channel;

        const isInRestrictedChannel =
          newChannel?.name.startsWith("Jail") ||
          newChannel?.name.startsWith("Verify");
        // conditions: there's a new channel, the new channel is not restricted and does not have jail role nor the unverified role
        const shouldHaveRole =
          newChannel !== null &&
          !isInRestrictedChannel &&
          !member.roles.cache.has(jailRole.id) &&
          !member.roles.cache.has(unverified.id);

        if (shouldHaveRole && !member.roles.cache.has(inVcRole.id)) {
          await member.roles
            .add(inVcRole)
            .then(() =>
              console.log(
                `[Role Add] Added "IN VC" to ${member.user.tag} in ${guild.name}`
              )
            )
            .catch((err: any) =>
              console.error(
                `[Role Error] Failed to add "IN VC" to ${member.user.tag}:`,
                err
              )
            );
        } else if (!shouldHaveRole && member.roles.cache.has(inVcRole.id)) {
          await member.roles
            .remove(inVcRole)
            .then(() =>
              console.log(
                `[Role Remove] Removed "IN VC" from ${member.user.tag} in ${guild.name}`
              )
            )
            .catch((err: any) =>
              console.error(
                `[Role Error] Failed to remove "IN VC" from ${member.user.tag}:`,
                err
              )
            );
        }

        // 4. VC Movement Logging
        const vc_logs = getChannel("vc-logs", "text", guild);

        if (!vc_logs) {
          // Optional: Only log this once to avoid spamming console
          return;
        }

        if (!canSendMessages(vc_logs, botMember)) {
          console.error(
            `[Permission Error] Cannot send messages in #vc-logs in ${guild.name}`
          );
          return;
        }

        // Join
        if (!previousState.channelId && newState.channelId) {
          await vc_logs.send(
            `📥 **${member.displayName}** joined <#${newState.channelId}>.`
          );
        }
        // Leave
        else if (previousState.channelId && !newState.channelId) {
          await vc_logs.send(
            `📤 \`${member.displayName}\` left <#${previousState.channelId}>.`
          );
        }
        // Move
        else if (previousState.channelId !== newState.channelId) {
          await vc_logs.send(
            `🔄 **${member.displayName}** moved: <#${previousState.channelId}> ➔ <#${newState.channelId}>.`
          );
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
    PermissionsBitField.Flags.EmbedLinks, // Good to have for cleaner logs
  ]);
}
