import { WEventListener } from "../types/w-event-listener";
import { logError } from "../utils/log-error";

export default function listener(): WEventListener {
    return {
        name: "voiceStateUpdate",
        handler: async (previousState, newState) => {
            try {
                // [VC Joined]
                if (previousState.channelId === null && newState.channelId !== null) {
                    newState.channel?.send(`**${newState.member?.displayName}** has joined <#${newState.channelId}>.`);
                }

                // [VC Left]
                if (previousState.channelId !== null && newState.channelId === null) {
                    previousState.channel?.send(`\`${newState.member?.displayName}\` has left <#${previousState.channelId}>.`);
                }
            } catch (error) {
                logError(error, __filename);
            }
        }
    }
}