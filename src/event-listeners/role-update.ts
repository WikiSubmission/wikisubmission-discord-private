import { WEventListener } from "../types/w-event-listener";
import { logError } from "../utils/log-error";
import { syncMember } from "../utils/discord/sync-member";

export default function listener(): WEventListener {
    return {
        name: "roleUpdate",
        handler: async (oldRole, newRole) => {
            try {
                if (oldRole.name !== newRole.name || oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
                    // Role properties changed, not affecting members
                    return;
                }

                const guild = newRole.guild;
                const membersWithRole = await guild.members.fetch();
                const affectedMembers = membersWithRole.filter(member =>
                    member.roles.cache.has(newRole.id)
                );

                await Promise.all(
                    affectedMembers.map(member => syncMember(member, 'roleUpdate'))
                );
            } catch (error) {
                logError(error, __filename);
            }
        },
    };
}