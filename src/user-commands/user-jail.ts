import {
  ApplicationCommandType,
  EmbedBuilder,
  GuildMember,
  GuildMemberRoleManager,
} from "discord.js";
import { WUserCommand } from "../types/w-user-command";
import { getChannel } from "../utils/get-channel";
import { getRole } from "../utils/get-role";
import { authenticateMember } from "../utils/authenticate-member";
import { DateUtils } from "../utils/date-utils";
import { stringifyName } from "../utils/stringify-name";

export default function Command(): WUserCommand {
  return {
    name: "jail",
    type: ApplicationCommandType.User,
    execute: async (interaction) => {
      try {
        const suspect = interaction.targetMember;
        if (!suspect) {
          console.error("Member not found when trying user jail.");
          await interaction.reply({
            content:
              "Could not find member to jail. Please try again, if this persist contact a dev. ",
            flags: "Ephemeral",
          });
          return;
        }
        // [No friendly fire]
        if (authenticateMember(suspect, "MOD_AND_ABOVE")) {
          await interaction.reply({
            content: `No friendly fire!`,
            flags: ["Ephemeral"],
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
          suspect.roles.cache.has(jailRole.id) &&
          suspect instanceof GuildMember
        ) {
          await interaction.reply({
            content: `User <@${suspect.id}> is already jailed`,
            flags: "Ephemeral",
          });
          return;
        }
        if (
          suspect.roles instanceof GuildMemberRoleManager &&
          suspect instanceof GuildMember
        ) {
          suspect.roles.add(jailRole);
          await interaction.reply({
            content: `User <@${suspect.id}> has been jailed!`,
            flags: "Ephemeral",
          });
          const jailChannel = getChannel("jail", "text", interaction);
          const staffChannel = getChannel("staff-log", "text", interaction);
          if (!jailChannel) {
            console.error("No jail channel. Please create one. ");
          } else {
            await jailChannel.send({
              content: `<@${suspect.user.id}> **You have been jailed.** Please wait for a moderator to review the incident.`,
              embeds: [
                new EmbedBuilder()
                  // .setDescription(reason || 'No reason provided')
                  .addFields(
                    {
                      name: "User",
                      value: stringifyName(suspect),
                    },
                    {
                      name: "Account Created",
                      value: DateUtils.distanceFromNow(
                        suspect.user.createdTimestamp
                      ),
                    },
                    {
                      name: "Joined",
                      value: DateUtils.distanceFromNow(suspect.joinedTimestamp),
                    }
                  )
                  .setFooter({
                    text: `${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL(),
                  })
                  .setTimestamp(Date.now())
                  .setThumbnail(suspect.displayAvatarURL())
                  .setColor("DarkRed"),
              ],
            });
          }

          if (!staffChannel) {
            console.error("No staff channel. Please create one. ");
          } else {
            await staffChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setAuthor({
                    name: `${suspect.user.username} was jailed`,
                    iconURL: suspect.displayAvatarURL(),
                  })
                  // .setDescription(reason || 'No reason provided')
                  .addFields(
                    {
                      name: "User",
                      value: stringifyName(suspect),
                    },
                    {
                      name: "Account Created",
                      value: DateUtils.distanceFromNow(
                        suspect.user.createdTimestamp
                      ),
                    },
                    {
                      name: "Joined",
                      value: DateUtils.distanceFromNow(suspect.joinedTimestamp),
                    }
                  )
                  .setFooter({
                    text: `${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL(),
                  })
                  .setThumbnail(suspect.displayAvatarURL())
                  .setTimestamp(Date.now())
                  .setColor("DarkButNotBlack"),
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
