import { WEventListener } from "../types/w-event-listener";
import { getChannel } from "../utils/discord/get-channel";
import { logError } from "../utils/log-error";

export default function listener(): WEventListener {
    return {
        name: "voiceStateUpdate",
        handler: async (previousState, newState) => {
            try {
                // [VC Joined]
                if (previousState.channelId === null && newState.channelId !== null) {
                    const associatedTextChannel = getChannel(`${newState.channel?.name?.split(" ")[0].toLowerCase().trim()}-chat`);

                    if (associatedTextChannel) {
                        associatedTextChannel.send(`<@${newState.id}> has joined <#${newState.channelId}>.`);
                    }
                }

                // [VC Left]
                if (previousState.channelId !== null && newState.channelId === null) {
                    const associatedTextChannel = getChannel(`${previousState.channel?.name?.split(" ")[0].toLowerCase().trim()}-chat`);

                    if (associatedTextChannel) {
                        associatedTextChannel.send(`\`${previousState.member?.displayName}\` has left <#${previousState.channelId}>.`);
                    }
                }
            } catch (error) {
                logError(error, __filename);
            }
        }
    }
}