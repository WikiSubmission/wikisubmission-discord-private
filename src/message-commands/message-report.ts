import {
  ActionRowBuilder,
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  ModalBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { WMessageCommand } from '../types/w-message-command'
import { getChannel } from '../utils/get-channel'
import { getRole } from '../utils/get-role'

export default function Command(): WMessageCommand {
  return {
    name: 'Report Message',
    type: ApplicationCommandType.Message,
    async execute(interaction) {
      console.log(`[ReportCommand] Triggered by ${interaction.user.tag}`)

      try {
        // ✅ Step 1: Show modal
        const modal = new ModalBuilder()
          .setCustomId(`report-modal-${interaction.targetMessage.id}`)
          .setTitle('Report Message')

        const reasonInput = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Reason for report')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Explain briefly why you are reporting this message...')
          .setRequired(true)

        const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
        modal.addComponents(actionRow)

        console.log('[ReportCommand] Showing modal...')
        await interaction.showModal(modal)
        console.log('[ReportCommand] Modal shown, waiting for submission...')

        const submission = await interaction.awaitModalSubmit({
          time: 5 * 60_000, // 5 minutes
          filter: (i) => i.customId === `report-modal-${interaction.targetMessage.id}`,
        })

        console.log('[ReportCommand] Modal submitted.')

        // ✅ Step 2: Extract reason + prepare report
        const reason = submission.fields.getTextInputValue('reason')
        console.log(`[ReportCommand] Reason received: ${reason}`)

        const reportChannel = getChannel('report-logs', 'text', interaction) as TextChannel | null
        if (!reportChannel) {
          console.error('[ReportCommand] Missing "report-logs" channel.')
          const staffLogs = getChannel('staff-log', 'text', interaction)
          const devRole = getRole('Developer')
          if (staffLogs && devRole) {
            await staffLogs.send({
              content: `⚠️ Channel 'report-logs' not found. Please create one. <@${devRole.id}>`,
            })
          }
          submission.reply({
            content: '❌ Reporting channel not found. Please contact staff.',
            ephemeral: true,
          })
          return
        }

        const targetMessage = interaction.targetMessage
        const reporter = interaction.user
        const suspect = targetMessage.author

        // ✅ Step 3: Create report thread
        console.log(`[ReportCommand] Creating thread for ${suspect?.tag}`)
        const thread = await reportChannel.threads.create({
          name: `Report: ${suspect?.username ?? 'UnknownUser'}`,
          autoArchiveDuration: 1440,
          reason: reason,
        })
        console.log('[ReportCommand] Thread created:', thread.name)

        await thread.send({
          content: `🧾 **Report Created** by <@${reporter.id}> against <@${suspect?.id}>`,
        })

        await thread.send({
          content: `**Reason:** ${reason}\n**Reported message:**\n> ${targetMessage.content || '(no text)'}\n[Jump to message](${targetMessage.url})`,
        })

        // ✅ Step 4: Fetch context
        console.log('[ReportCommand] Fetching context...')
        const N = 5
        const channel = targetMessage.channel as TextChannel
        const fetched = await channel.messages.fetch({
          around: targetMessage.id,
          limit: N * 2 + 1,
        })
        console.log(`[ReportCommand] Fetched ${fetched.size} messages for context.`)

        const sorted = Array.from(fetched.values()).sort(
          (a, b) => a.createdTimestamp - b.createdTimestamp
        )

        const contextText = sorted
          .map((m) => {
            if (m.attachments.size > 0) {
              for (const [, attachment] of m.attachments) {
                thread.send({ content: `📎 ${attachment.url}` })
              }
            }
            const label = m.id === targetMessage.id ? '🔴 [REPORTED]' : '▫️'
            return `${label} **${m.author.tag}:** ${m.content || '(no text)'}`
          })
          .join('\n')

        await thread.send({
          content: `**Context (${N} before / ${N} after):**\n${contextText}`,
        })

        // ✅ Step 5: Confirm success
        console.log('[ReportCommand] Sending confirmation to reporter...')
        await submission.reply({
          content: '✅ Report logged. A moderator will review it shortly.',
          ephemeral: true,
        })
        console.log('[ReportCommand] Done.')
      } catch (error) {
        console.error('[ReportCommand] Error:', error)

        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: '❌ Failed to log report. Please contact a moderator.',
              ephemeral: true,
            })
          } else {
            await interaction.reply({
              content: '❌ Failed to log report. Please contact a moderator.',
              ephemeral: true,
            })
          }
        } catch (replyError) {
          console.error('[ReportCommand] Failed to send error reply:', replyError)
        }
      }
    },
  }
}
