import { EmbedBuilder } from "discord.js";
import { WEventListener } from "../types/w-event-listener";
import { getChannel, getChannels } from "../utils/discord/get-channel";
import { getSupabaseClient } from "../utils/get-supabase-client";
import { stringifyName } from "../utils/discord/stringify-name";
import { DateUtils } from "../utils/date-utils";
import { stringifyRoles } from "../utils/discord/stringify-roles";
import { syncMember } from "../utils/discord/sync-member";
import { getRole } from "../utils/discord/get-role";
import { logError } from "../utils/log-error";

export default function listener(): WEventListener {
  return {
    name: "guildMemberAdd",
    handler: async (member) => {
      console.log(
        `Member "${member.user.username} (${member.user.displayName})" joined ${member.guild.name} (${member.guild.id}). Members: ${member.guild.memberCount}.`,
      );

      try {
        // [Required channels]
        const channels = getChannels(
          ["admissions", "staff-log", "welcome", "choose-roles"],
          "text",
          member,
        );
        if (!channels) {
          console.warn(`At least one channel not found: staff-log / welcome.`);
          return;
        }

        // [Check DB]
        const memberRecord = await getSupabaseClient()
          .from("DiscordMembers")
          .select("*")
          .eq("id", `${member.user.id}*${member.guild.id}`)
          .single();

        // [Case: member not found i.e. newly joined]
        if (!memberRecord.data) {
          // [Welcome]
          channels["welcome"].send({
            content: `<@${member.user.id}>`,
            embeds: [
              new EmbedBuilder()
                .setTitle("Peace be upon you!")
                .setThumbnail(member.displayAvatarURL())
                .setColor("DarkBlue")
                .setTimestamp(Date.now())
                .setDescription(
                  `**Welcome to the Submission Server,** ${member.user.displayName || member.user.username}. Feel free to look around and check out the different channels.\n\nThis server is most active with voice chat activity. Join <#${getChannel("VC1", "voice", member)?.id || "576134569338732565"}> any time to get involved in discussions, ask questions, share your thoughts, or just listen in.\n\nYou can choose your server-roles at <#${channels["choose-roles"].id}>.`,
                )
                .setFooter({
                  text:
                    member.guild.memberCount % 19 === 0
                      ? `Members: ${member.guild.memberCount} (19 x ${Math.floor(member.guild.memberCount / 19)}) • ${member.user.username}`
                      : `Members: ${member.guild.memberCount} • ${member.user.username}`,
                }),
            ],
          });

          // [Staff notice]
          const rolesString = stringifyRoles(member);
          channels["admissions"].send({
            embeds: [
              new EmbedBuilder()
                .setAuthor({
                  name: `${member.user.username} has joined`,
                  iconURL: member.displayAvatarURL(),
                })
                .setThumbnail(member.displayAvatarURL())
                .setColor("DarkGreen")
                .setTimestamp(Date.now())
                .setFooter({
                  text: `Member count: ${member.guild.memberCount}`,
                })
                .addFields(
                  {
                    name: "User",
                    value: stringifyName(member),
                  },
                  {
                    name: "Account Created",
                    value: DateUtils.distanceFromNow(
                      member.user.createdTimestamp,
                    ),
                  },
                  ...(rolesString !== "None"
                    ? [
                        {
                          name: "Roles",
                          value: rolesString,
                        },
                      ]
                    : []),
                ),
            ],
          });
        }

        // [Case: member found i.e. rejoined]
        else {
          // [Welcome message]
          await channels["welcome"].send({
            content: `<@${member.user.id}>`,
            embeds: [
              new EmbedBuilder()
                .setTitle("Peace be upon you!")
                .setThumbnail(member.displayAvatarURL())
                .setColor("DarkBlue")
                .setTimestamp(Date.now())
                .setDescription(
                  `**Welcome back,** <@${member.user.id}>. Join <#${getChannel("VC1", "text", member)?.id || "576134569338732565"}> any time to get involved in discussions, ask questions, share your thoughts, or just listen in.\n\nYou can choose your server-roles at <#${getChannel("choose-roles", "text", member)?.id || "576134569338732565"}>.`,
                )
                .setFooter({
                  text:
                    member.guild.memberCount % 19 === 0
                      ? `Members: ${member.guild.memberCount} (19 x ${Math.floor(member.guild.memberCount / 19)}) • ${member.user.username}`
                      : `Members: ${member.guild.memberCount} • ${member.user.username}`,
                }),
            ],
          });

          // [Staff notice]
          await channels["admissions"].send({
            embeds: [
              new EmbedBuilder()
                .setColor("DarkButNotBlack")
                .setTimestamp(Date.now())
                .setAuthor({
                  name: `${member.user.username} has joined (again)`,
                  iconURL: member.displayAvatarURL(),
                })
                .addFields(
                  {
                    name: "User",
                    value: stringifyName(member),
                  },
                  {
                    name: "Account Created",
                    value: DateUtils.distanceFromNow(
                      member.user.createdTimestamp,
                    ),
                  },
                  {
                    name: "Last Joined",
                    value:
                      DateUtils.distanceFromNow(
                        memberRecord.data.joined_timestamp,
                      ) || "Not available",
                  },
                  {
                    name: "Previous Username",
                    value: memberRecord.data.user_name
                      ? `${memberRecord.data.user_name}${memberRecord.data.display_name ? ` / ${memberRecord.data.display_name}` : ""}`
                      : "Not available",
                  },
                  {
                    name: "Previous Roles",
                    value:
                      memberRecord.data.roles &&
                      memberRecord.data.roles.trim().length > 0
                        ? memberRecord.data.roles
                            .split(",")
                            .map((r) => `<@&${r}>`)
                            .join(", ")
                        : "No previous roles",
                  },
                ),
            ],
          });

          // === [Rejail if previously jailed] ===

          // [Dependencies]
          const jailChannel = getChannel("jail", "text", member);
          const jailRole = getRole("Jail", member);
          if (!jailChannel) {
            console.warn(`Jail channel not found`);
            return;
          }
          if (!jailRole) {
            console.warn(`Jail role not found`);
            return;
          }

          // [Case: was previously jailed]
          if (memberRecord.data.roles.split(",").includes(jailRole.id)) {
            // [Add back role]
            await member.roles.add(jailRole.id);

            // [Alert user]
            await jailChannel.send({
              content: `<@${member.user.id}> **You have been jailed**. Please wait for a moderator to review the incident.`,
              embeds: [
                new EmbedBuilder()
                  .setDescription(`Reason: rejoined (previously jailed)`)
                  .addFields({
                    name: "User",
                    value: stringifyName(member),
                  })
                  .setFooter({
                    text: member.client.user.username,
                    iconURL: member.client.user.displayAvatarURL(),
                  })
                  .setTimestamp(Date.now())
                  .setThumbnail(member.displayAvatarURL())
                  .setColor("DarkRed"),
              ],
            });

            // [Staff notice]
            await channels["staff-log"].send({
              embeds: [
                new EmbedBuilder()
                  .setAuthor({
                    name: `${member.user.username} was jailed`,
                    iconURL: member.displayAvatarURL(),
                  })
                  .addFields({
                    name: "Reason",
                    value: "Rejoined (previously jailed)",
                  })
                  .setFooter({
                    text: member.client.user.username,
                    iconURL: member.client.user.displayAvatarURL(),
                  })
                  .setThumbnail(member.displayAvatarURL())
                  .setTimestamp(Date.now())
                  .setColor("DarkRed"),
              ],
            });
          }

          // === [Reinterrogate if previously pending verification] ===

          // [Dependencies]
          const verifyChannel = getChannel("verify", "text", member);
          const unverifiedRole = getRole("Unverified", member);
          if (!verifyChannel) {
            console.warn(`Verify channel not found`);
            return;
          }
          if (!unverifiedRole) {
            console.warn(`Unveriried role not found`);
            return;
          }

          // [Case: was previously unverified]
          if (memberRecord.data.roles.split(",").includes(unverifiedRole.id)) {
            // [Add back role]
            await member.roles.add(unverifiedRole.id);

            // [Alert user]
            await verifyChannel.send({
              content: `<@${member.user.id}> **Please verify with a staff member to gain access to the server.**`,
              embeds: [
                new EmbedBuilder()
                  .addFields({
                    name: "User",
                    value: stringifyName(member),
                  })
                  .setFooter({
                    text: `${member.client.user.username}`,
                    iconURL: member.client.user.displayAvatarURL(),
                  })
                  .setTimestamp(Date.now())
                  .setThumbnail(member.displayAvatarURL())
                  .setColor("DarkRed"),
              ],
            });

            // [Staff notice]
            await channels["staff-log"].send({
              embeds: [
                new EmbedBuilder()
                  .setAuthor({
                    name: `${member.user.username} was sent to verification channel`,
                    iconURL: member.displayAvatarURL(),
                  })
                  .addFields({
                    name: "User",
                    value: stringifyName(member),
                  })
                  .setFooter({
                    text: `${member.user.username}`,
                    iconURL: member.user.displayAvatarURL(),
                  })
                  .setThumbnail(member.displayAvatarURL())
                  .setTimestamp(Date.now())
                  .setColor("DarkRed"),
              ],
            });
          }
        }

        await syncMember(member);
      } catch (error) {
        logError(error, __filename);
      }
    },
  };
}
