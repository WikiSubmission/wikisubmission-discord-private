import { WEventListener } from "../types/w-event-listener";
import { logError } from "../utils/log-error";
import { syncMember } from "../utils/sync-member";

export default function listener(): WEventListener {
  return {
    name: "guildMemberUpdate",
    handler: async (oldMember, newMember) => {
      try {
        // [Check if roles were changed]
        if (
          oldMember.roles.cache.size !== newMember.roles.cache.size ||
          !oldMember.roles.cache.every((role) =>
            newMember.roles.cache.has(role.id)
          )
        ) {
          await syncMember(newMember, "guildMemberUpdate");
        }
      } catch (error) {
        logError(error, __filename);
      }
    },
  };
}
