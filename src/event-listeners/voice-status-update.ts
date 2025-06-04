import { WEventListener } from "../types/w-event-listener";
import { logError } from "../utils/log-error";
import { PermissionsBitField } from "discord.js";

export default function listener(): WEventListener {
    return {
        name: "voiceStateUpdate",
        handler: async (previousState, newState) => {
            try {
                // [VC Joined]
                if (previousState.channelId === null && newState.channelId !== null) {
                    if (newState.channel?.permissionsFor(newState.guild.members.me!)?.has(PermissionsBitField.Flags.SendMessages)) {
                        newState.channel.send(`**${newState.member?.displayName}** has joined <#${newState.channelId}>.`);
                    }
                }

                // [VC Left]
                if (previousState.channelId !== null && newState.channelId === null) {
                    if (previousState.channel?.permissionsFor(previousState.guild.members.me!)?.has(PermissionsBitField.Flags.SendMessages)) {
                        previousState.channel.send(`\`${newState.member?.displayName}\` has left <#${previousState.channelId}>.`);
                    }
                }
            } catch (error) {
                logError(error, __filename);
            }
        }
    }
}