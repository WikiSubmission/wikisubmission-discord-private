import { WEventListener } from "../types/w-event-listener";
import { logError } from "../utils/log-error";
import { syncMember } from "../utils/discord/sync-member";

export default function listener(): WEventListener {
    return {
        name: "roleUpdate",
        handler: async (_, newRole) => {
            try {
                await Promise.all(
                    [...newRole.members.values()].map(member => syncMember(member))
                );
            } catch (error) {
                logError(error, __filename);
            }
        },
    };
}