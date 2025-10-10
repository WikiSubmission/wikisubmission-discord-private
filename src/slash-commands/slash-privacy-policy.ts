import { EmbedBuilder } from 'discord.js'
import { WSlashCommand } from '../types/w-slash-command'
import { getSupabaseClient } from '../utils/get-supabase-client'
import NodeCache from 'node-cache'

const cache = new NodeCache({ stdTTL: 60 * 60 * 6 }) // cache for 6 hour

export default function Command(): WSlashCommand {
  return {
    name: 'privacy-policy',
    description: 'Displays the privacy policy for SubmissionMod',
    execute: async (interaction) => {
      try {
        interaction.deferReply()
        let retentionDays: number = 30
        let updatedTimestamp = 'N/A'

        // ✅ Try cache first
        const cached = cache.get<{ retentionDays: number; updatedTimestamp: string }>(
          'privacy_policy'
        )
        if (cached) {
          retentionDays = cached.retentionDays
          updatedTimestamp = cached.updatedTimestamp
        } else {
          // Fetch the log retention setting and timestamp from database
          const supaClient = getSupabaseClient()
          const { data, error } = await supaClient
            .from('DiscordSecrets')
            .select('key, value')
            .in('key', [
              'DISCORD_AUTO_DELETE_LOGS_AFTER',
              'DISCORD_AUTO_DELETE_LOGS_AFTER_LAST_TIMESTAMP',
            ])

          if (!error && data) {
            const logsAfter = data.find((d: any) => d.key === 'DISCORD_AUTO_DELETE_LOGS_AFTER')
            const updated = data.find(
              (d: any) => d.key === 'DISCORD_AUTO_DELETE_LOGS_AFTER_LAST_TIMESTAMP'
            )

            if (logsAfter?.value) {
              retentionDays = Number(logsAfter.value) || -1
            }

            // Prefer an explicit timestamp record if present, fallback to `updated_at`
            updatedTimestamp = updated?.value ? new Date(updated.value).toLocaleDateString() : 'N/A'

            // 💾 Store in cache
            cache.set('privacy_policy', { retentionDays, updatedTimestamp })
          }
        }

        const embed = new EmbedBuilder()
          .setAuthor({
            name: 'SubmissionMod • Privacy Policy',
            iconURL: 'https://library.wikisubmission.org/file/book.1024x1024.png',
          })
          .setColor(0x00bcd4)
          .setTitle('🛡️ Data & Privacy Notice')
          .setDescription(
            `This bot logs limited message data for moderation purposes only.\nAll information is handled securely and deleted after a set retention period.`
          )
          .addFields(
            {
              name: '📅 Last Updated',
              value: updatedTimestamp,
              inline: true,
            },
            {
              name: '🧾 What We Log',
              value: [
                '• **Deleted messages:** user ID and deleted content',
                '• **Edited messages:** user ID, old content, and new content',
                '• **Timestamps** for all logged actions',
              ].join('\n'),
            },
            {
              name: '📦 Retention Period',
              value: `Logs are stored for **${retentionDays} day(s)** by default.
This duration may change at any time — any update will be reflected here.`,
            },
            {
              name: '🧍 User Deletion Requests',
              value:
                "You can delete all your stored data anytime using the `/request-log-deletions` command.\nYour data will be permanently erased within **7 days**, and you'll receive a DM confirmation.",
            },
            {
              name: '🔒 Who Can Access Logs?',
              value:
                'Only **authorized moderators** (users with the `Mod` role) can access message logs.\nLogs are never shared or used for analytics or advertising.',
            },
            {
              name: '⚙️ Security',
              value:
                'All logs are securely stored and access is restricted to maintain data integrity and confidentiality.',
            },
            {
              name: '📢 Updates to This Policy',
              value:
                'We may revise this policy as needed. The most recent version will always appear in this embed.',
            }
          )
          .setFooter({
            text: 'SubmissionMod • Glory be to the Lord!',
            iconURL: 'https://library.wikisubmission.org/file/book.1024x1024.png',
          })
          .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
      } catch (err: any) {
        console.error('[privacy-policy] Error:', err)
        await interaction.editReply({
          content:
            'Something went wrong while fetching the privacy policy. Please try again later.',
        })
      }
    },
  }
}
