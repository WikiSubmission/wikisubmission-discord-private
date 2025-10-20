import { WSlashCommand } from '../types/w-slash-command'
import { EmbedBuilder } from 'discord.js'

export default function Command(): WSlashCommand {
  return {
    name: 'rules',
    description: 'Server rules. Please abide.',
    execute: async (interaction) => {
      try {
        await interaction.deferReply()
        const embed = new EmbedBuilder()
          .setAuthor({
            name: 'SubmissionMod',
            iconURL: 'https://library.wikisubmission.org/file/book.1024x1024.png',
          })
          .setColor(0xeaa13d)
          .setTitle('بِسْمِ ٱللّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ')
          .setDescription(
            '📏 **Server Rules** 📏\nWelcome to the Submitter Community! As a fully public platform, anyone is welcome to interact. Please make sure to follow the server rules and guidelines below!'
          )
          .addFields(
            {
              name: 'Rules',
              value: [
                '1. No violation of Discord Terms of Service or Community Guidelines.',
                '2. No spamming.',
                '3. No personal attacks.',
                '4. No trolling.',
                '5. No profanity (4:148).',
                '6. No mocking or ridiculing (49:11).',
                '7. Post messages and content in appropriate channels.',
                '8. No advertising (including DMs).',
                '9. Voice verification upon request.',
                '10. Obey moderation requests promptly.',
              ].join('\n'),
            },
            {
              name: 'Guidelines',
              value: [
                '1. Treat each other in the best possible manner (17:53).',
                "2. Respect people's boundaries regarding what they are comfortable discussing (58:11).",
                '3. Do not spread gossip or false information (49:6).',
                '4. Give people the benefit of the doubt and avoid suspicion (49:12).',
                '5. Advocate tolerance (7:199).',
                '6. Do not be an aggressor (2:190).',
                '7. Promote reconciliation and do not tolerate aggression (49:9).',
                '8. Remind with the Quran (25:73).',
              ].join('\n'),
            },
            {
              name: 'Reporting Violations',
              value:
                'Right-click (or long-press on mobile) a message → Apps → Report Message. A moderator will review it shortly.',
            }
          )

        await interaction.editReply({
          embeds: [embed],
        })
      } catch (error) {
        console.error(error)
        await interaction.editReply({
          content: 'Something went wrong while fetching the server rules. Please try again later.',
        })
      }
    },
  }
}
