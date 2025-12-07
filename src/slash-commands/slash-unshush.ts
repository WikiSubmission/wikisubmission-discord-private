import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { WSlashCommand } from "../types/w-slash-command";
import { getChannel } from "../utils/get-channel";
import { getRole } from "../utils/get-role";
import { stringifyName } from "../utils/stringify-name";

export default function Command(): WSlashCommand {
  return {
    name: "unhush",
    description: "Remove slowdown from a user",
    options: [
      {
        name: "user",
        description: "User to release from hush",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "reason",
        description: "Reason for unhush (optional)",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
    access_control: "MOD_AND_ABOVE",
    execute: async (interaction) => {
      try {
        const userID = interaction.options.get("user")?.value;
        const reason: string = String(
          interaction.options.get("reason")?.value ?? "No reason provided."
        );

        if (typeof userID !== "string") {
          interaction.reply({
            content: "Cannot find the user to unhush.",
            flags: ["Ephemeral"],
          });
          return;
        }

        const member = interaction.guild?.members.cache.get(userID);
        if (!member) {
          interaction.reply({
            content: "Cannot find the user in this server.",
            flags: ["Ephemeral"],
          });
          return;
        }

        const hushRole = getRole("Hush");
        if (!hushRole) {
          interaction.reply({
            content: "Cannot find Hush role. Please contact a developer.",
            flags: ["Ephemeral"],
          });
          return;
        }

        if (!member.roles.cache.has(hushRole.id)) {
          interaction.reply({
            content: "User is not in slowdown mode.",
            flags: ["Ephemeral"],
          });
          return;
        }

        // Remove hush role
        await member.roles.remove(hushRole);

        // DM the user
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle("You have been released from hush")
            .setDescription(
              `Peace ${member},\n\nYou have been released from hush by the Wikisubmission moderation team.\n\n${
                reason ? `**Reason:** ${reason}\n\n` : ""
              }You can now send messages normally.`
            )
            .setColor("Green")
            .setTimestamp();

          await member.send({ embeds: [dmEmbed] });
        } catch {
          console.warn(`Cannot DM user ${member.user.tag}.`);
        }

        // Staff log
        const staffLog = getChannel("staff-log", "text", interaction);
        if (!staffLog) {
          const dev = getRole("Developer", interaction);
          interaction.reply({
            content: dev
              ? `<@&${dev.id}> The \`staff-log\` channel does not exist. Unhush command logging failed, command succeeded.`
              : "The `staff-log` channel does not exist. User unhushed, cannot log it. Please contact a Developer (Developer role not found).",
            flags: ["Ephemeral"],
          });
          return;
        }

        // Confirm to moderator
        await interaction.reply({
          content: "User has been released from hush!",
          flags: ["Ephemeral"],
        });

        // Log in staff channel
        if (staffLog != null) {
          await staffLog?.send({
            content: `<@${member.user.id}> has been unhushed.`,
            embeds: [
              new EmbedBuilder()
                .addFields(
                  { name: "User", value: stringifyName(member) },
                  {
                    name: "Released by",
                    value: stringifyName(interaction.user),
                  },
                  { name: "Reason", value: reason }
                )
                .setThumbnail(member.displayAvatarURL())
                .setFooter({
                  text: interaction.user.username,
                  iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp()
                .setColor("DarkGreen"),
            ],
          });
        }
      } catch (err) {
        console.error(err);
        interaction.reply({
          content: "An error occurred while trying to unhush the user.",
          flags: ["Ephemeral"],
        });
      }
    },
  };
}
