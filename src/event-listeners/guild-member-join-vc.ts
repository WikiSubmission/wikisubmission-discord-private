import { WEventListener } from '../types/w-event-listener'
import { getRole } from '../utils/discord/get-role'

export default function listener(): WEventListener {
  return {
    name: 'voiceStateUpdate',
    handler: (oldState, newState) => {
      try {
        const member = newState.member
        if (!member || member.user.bot) return
        const inVcRole = getRole('IN VC')
        if (!inVcRole) return
        const communityRole = getRole('Community', newState.guild)
        if (communityRole && member.roles.cache.has(communityRole.id)) return

        const oldChannel = oldState.channel
        const newChannel = newState.channel
        if (!oldChannel && newChannel) {
          member.roles.add(inVcRole)
        } else if (oldChannel && !newChannel) {
          member.roles.remove(inVcRole)
        }
      } catch (error) {
        console.error(error)
      }
    },
  }
}
