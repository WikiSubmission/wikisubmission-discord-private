import { WEventListener } from '../types/w-event-listener'
import { getRole } from '../utils/get-role'
import { getSupabaseClient } from '../utils/get-supabase-client'
import { logError } from '../utils/log-error'

// Cache to track last message timestamps
const lastMessageTimestamps = new Map<string, number>()
// Track users locked with permission overwrites
const lockedUsers = new Set<string>()

export default function listener(): WEventListener {
  return {
    name: 'messageCreate',
    handler: async (message) => {
      try {
        if (message.author.bot) return
        if (!message.guild || !message.member) return

        const member = message.member
        const now = Date.now()
        const last = lastMessageTimestamps.get(member.id) ?? 0
        const diff = (now - last) / 1000

        const hushRole = getRole('Hush')
        const slowRole = getRole('Slow')
        if (!slowRole) {
          // console.error('Cannot find Slow role. Please contact a dev')
          return
        }
        if (!hushRole) {
          console.error('Cannot find Hush role. Please contact a dev')
          return
        }
        const supaClient = getSupabaseClient()
        const { data, error, status } = await supaClient
          .from('DiscordSecrets')
          .select('*')
          .eq('key', 'DISCORD_HUSH_DURATION_SECONDS')
        if (error && status != 200) {
          console.error(
            '[EVENT:message-create-slowmode] error fetching from supabase: ',
            error.message
          )
          return
        }

        const DISCORD_HUSH_DURATION_SECONDS = parseInt(
          data?.find((k) => k.key === 'DISCORD_HUSH_DURATION_SECONDS')?.value ?? '10'
        )

        // Mode 1: Delete + warning (slowRole.id)
        if (member.roles.cache.has(slowRole.id)) {
          if (diff < DISCORD_HUSH_DURATION_SECONDS) {
            await message.delete().catch(() => {})

            const warning = await message.channel.send({
              content: `${member}, you must wait **${Math.ceil(
                DISCORD_HUSH_DURATION_SECONDS - diff
              )}s** before sending another message.`,
            })

            setTimeout(() => {
              warning.delete().catch(() => {})
            }, 5000)
            return
          }

          lastMessageTimestamps.set(member.id, now)
          return
        }

        // Mode 2: Permission block (hushRole.id)
        if (member.roles.cache.has(hushRole.id)) {
          if (diff < DISCORD_HUSH_DURATION_SECONDS) {
            await message.delete().catch(() => {})

            // Only apply permission overwrites for channels that support it
            if ('permissionOverwrites' in message.channel) {
              if (!lockedUsers.has(member.id)) {
                lockedUsers.add(member.id)

                await message.channel.permissionOverwrites
                  .edit(member.id, {
                    SendMessages: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false,
                    SendMessagesInThreads: false,
                  })
                  .catch(() => {})

                setTimeout(async () => {
                  if ('permissionOverwrites' in message.channel) {
                    await message.channel.permissionOverwrites.delete(member.id).catch(() => {})
                  }
                  lockedUsers.delete(member.id)
                }, DISCORD_HUSH_DURATION_SECONDS * 1000)
              }
            }
            return
          }

          lastMessageTimestamps.set(member.id, now)
          return
        }
      } catch (err) {
        logError(err, __filename)
      }
    },
  }
}
