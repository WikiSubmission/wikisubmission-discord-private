import {
  ApplicationCommandType,
  EmbedBuilder,
  GuildMember,
  GuildMemberRoleManager,
} from "discord.js";
import { WUserCommand } from "../types/w-user-command";
import { getChannel } from "../utils/get-channel";
import { getRole } from "../utils/get-role";

export default function Command(): WUserCommand {
  return {
    name: "unjail",
    type: ApplicationCommandType.User,
    execute: async (interaction) => {
      try {
        const suspect = interaction.targetMember;
        if (!suspect) {
          console.error("Member not found when trying user jail.");
          await interaction.reply({
            content:
              "Could not find member to unjail. Please try again, if this persist contact a dev. ",
            flags: "Ephemeral",
          });
          return;
        }
        const jailRole = getRole("Jail", interaction);
        if (!jailRole) {
          await interaction.reply({
            content: "Could not find jail role. Please contact a dev. ",
            flags: "Ephemeral",
          });
          return;
        }
        if (
          suspect.roles instanceof GuildMemberRoleManager &&
          !suspect.roles.cache.has(jailRole.id) &&
          suspect instanceof GuildMember
        ) {
          await interaction.reply({
            content: `User <@${suspect.id}> is not jailed`,
            flags: "Ephemeral",
          });
          return;
        }
        if (
          suspect.roles instanceof GuildMemberRoleManager &&
          suspect instanceof GuildMember
        ) {
          suspect.roles.remove(jailRole);
          await interaction.reply({
            content: `User <@${suspect.id}> has been unjailed!`,
            flags: "Ephemeral",
          });
          const staffChannel = getChannel("staff-log", "text", interaction);
          if (!staffChannel) {
            console.error("No staff channel. please create one. ");
          } else {
            staffChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setAuthor({
                    name: `${suspect.user.username} released`,
                    iconURL: suspect.displayAvatarURL(),
                  })
                  .setFooter({
                    text: `${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL(),
                  })
                  .setTimestamp(Date.now())
                  .setColor("DarkGreen"),
              ],
            });
          }
          return;
        } else {
          await interaction.reply({
            content: "An unknown error occured. Please contact a dev. ",
            flags: "Ephemeral",
          });
          return;
        }
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "Could not find user to jail.",
          flags: "Ephemeral",
        });
        return;
      }
    },
  };
}
