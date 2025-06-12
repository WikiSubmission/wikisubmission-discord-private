import { WEventListener } from "../types/w-event-listener";
import { PermissionsBitField, GuildMember, VoiceBasedChannel } from "discord.js";
import { logError } from "../utils/log-error";

export default function listener(): WEventListener {
    return {
        name: "voiceStateUpdate",
        handler: async (previousState, newState) => {
            try {
                const botMember = newState.guild.members.me;

                // [VC Joined]
                if (previousState.channelId === null && newState.channelId !== null) {
                    const channel = newState.channel;
                    if (channel && canSendMessages(channel, botMember)) {
                        await channel.send(`**${newState.member?.displayName}** has joined <#${newState.channelId}>.`);
                    }
                }

                // [VC Left]
                if (previousState.channelId !== null && newState.channelId === null) {
                    const channel = previousState.channel;
                    if (channel && canSendMessages(channel, botMember)) {
                        await channel.send(`\`${newState.member?.displayName}\` has left <#${previousState.channelId}>.`);
                    }
                }
            } catch (error) {
                logError(error, __filename);
            }
        }
    }
}

function canSendMessages(channel: VoiceBasedChannel | null | undefined, botMember: GuildMember | null): boolean {
    if (!channel || !botMember) return false;

    // Get bot's permissions in the channel
    const permissions = channel.permissionsFor(botMember);
    if (!permissions) return false;

    // Check for both SendMessages and ViewChannel permissions
    return permissions.has([
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ViewChannel
    ]);
}
