import { ApplicationCommandOptionType, GuildMember } from 'discord.js'
import { WSlashCommand } from '../types/w-slash-command'

export default function Command(): WSlashCommand {
  return {
    name: 'disconnect-me',
    description: 'Disconnects the user from the voice channel',
    options: [
      {
        name: 'in',
        description: 'Time to disconnect in',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          {
            name: 'now',
            value: 'now',
          },
          {
            name: '15 minutes',
            value: '900',
          },
          {
            name: '30 minutes',
            value: '1800',
          },
          {
            name: '1 hour',
            value: '3600',
          },
          {
            name: '2 hours',
            value: '7200',
          },
        ],
      },
    ],
    execute: async (interaction) => {
      if (!interaction.isChatInputCommand()) return
      await interaction.deferReply({ flags: 'Ephemeral' })

      const member = interaction.member
      if (!(member instanceof GuildMember)) return

      const voiceChannel = member.voice?.channel
      if (!voiceChannel) {
        await interaction.editReply('You are not in a voice channel')
        return
      }
      const time = interaction.options.getString('in') ?? 'now'

      if (time === 'now') {
        member.voice.disconnect()
        await interaction.editReply('Disconnected immediately.')
      } else {
        const seconds = Number(time)
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) {
          await interaction.editReply(`Will be disconnected in ${minutes} minutes`)
        } else {
          const hours = Math.floor(minutes / 60)
          const remainingMinutes = minutes % 60
          await interaction.editReply(
            `Will disconnect in ${hours} hours and ${remainingMinutes} minutes`
          )
        }
        setTimeout(async () => {
          await member.voice.disconnect()
        }, seconds * 1000)
      }
    },
  }
}
