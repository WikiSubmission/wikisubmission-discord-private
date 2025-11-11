import { WEventListener } from '../types/w-event-listener'

export default function listener(): WEventListener {
  return {
    name: 'messageReactionAdd',
    handler: async (reaction, user) => {
      try {
        // Ignore bot reactions
        if (user.bot) {
          return
        }

        // Handle partials
        if (reaction.partial) {
          await reaction.fetch().catch((err) => {
            console.warn('⚠️ Failed to fetch partial reaction', err)
          })
        }
        if (reaction.message.partial) {
          await reaction.message.fetch().catch((err) => {
            console.warn('⚠️ Failed to fetch partial message', err)
          })
        }

        const message = reaction.message

        if (!message.author) {
          return
        }

        // Only handle messages from this bot
        if (message.author.id !== user.client.user.id) {
          return
        }

        // Check if this bot message was a reply to the same user reacting
        let isReplyToUser = false
        if (message.reference?.messageId) {
          try {
            const repliedTo = await message.channel.messages.fetch(message.reference.messageId)
            isReplyToUser = repliedTo.author.id === user.id
          } catch {
            console.warn('⚠️ Could not fetch the referenced message (maybe deleted).')
          }
        }

        if (!isReplyToUser) return

        // Check for ❌ emoji
        if (reaction.emoji.name === '❌') {
          await message.delete()
        }
      } catch (error) {
        console.error('❌ An unknown error occurred while handling a reaction:', error)
      }
    },
  }
}
