import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { WSlashCommand } from "../types/w-slash-command";
import { getChannel } from "../utils/get-channel";
import { getRole } from "../utils/get-role";
import { stringifyName } from "../utils/stringify-name";

export default function Command(): WSlashCommand {
  return {
    name: "hush",
    description: "Applies slowdown to a user",
    options: [
      {
        name: "user",
        description: "User to slow",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "reason",
        description: "Why is the user being hushed? ",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
    access_control: "MOD_AND_ABOVE",
    execute: async (interaction) => {
      try {
        // [Fetch suspect]
        const suspectID = interaction.options.get("user")?.value;
        const reason: string = String(
          interaction.options.get("reason")?.value ?? "No reason provided."
        );

        if (typeof suspectID !== "string") {
          console.error("Cannot find user to hush");
          interaction.reply({
            content: "Cannot find user to hush.",
            flags: ["Ephemeral"],
          });
          return;
        }

        let suspect = interaction.guild?.members.cache.get(suspectID);
        if (!suspect) {
          console.error("Cannot find user to hush");
          interaction.reply({
            content: "Cannot find user to hush.",
            flags: ["Ephemeral"],
          });
          return;
        }

        const staffLog = getChannel("staff-log", "text", interaction);
        const hushRole = getRole("Hush");
        if (!hushRole) {
          console.error("Cannot find Hush role");
          interaction.reply({
            content: "Cannot find Hush role. Please contact a developer.",
            flags: ["Ephemeral"],
          });
          return;
        }
        if (suspect.roles.cache.has(hushRole.id)) {
          interaction.reply({
            content: "User is already hushed.",
            flags: "Ephemeral",
          });
          return;
        }
        // [Yes to friendly fire ;)]
        // if (authenticateMember(suspect, "MOD_AND_ABOVE")) {
        //   await interaction.reply({
        //     content: `No friendly fire!`,
        //     flags: ["Ephemeral"],
        //   });
        //   return;
        // }
        suspect.roles.add(hushRole);
        try {
          const warningEmbed = new EmbedBuilder()
            .setTitle("You have been hushed")
            .setDescription(
              `Peace ${suspect},\n\nYou have been hushed by the Wikisubmission moderation team.\n\n${
                reason ? `**Reason:** ${reason}\n\n` : ""
              }This is usually done by a moderator to help keep the chat organized or calm.\n\nIf you believe this was a mistake or wish to have your hush removed, please contact a moderator.`
            )
            .setColor("Red")
            .setTimestamp();

          await suspect.send({ embeds: [warningEmbed] });
        } catch (err) {
          console.warn(`Cannot DM user ${suspect.user.tag}.`);
        }
        if (!staffLog) {
          console.error("staff-log channel does not exist. Please recreate.");
          const dev = getRole("Developer", interaction);
          interaction.reply({
            content: dev
              ? `<@&${dev.id}> The \`staff-log\` channel does not exist. hush command logging failed, command succeded.`
              : "The `staff-log` channel does not exist. User hushed, cannot log it. Please contact a Developer (Developer role not found).",
          });
          return;
        } else {
          interaction.reply({
            content: "User has been hushed!",
            flags: "Ephemeral",
          });
          staffLog.send({
            content: `<@${suspect.user.id}> has been hushed.`,
            embeds: [
              new EmbedBuilder()
                .addFields(
                  {
                    name: "User",
                    value: stringifyName(suspect),
                  },
                  {
                    name: "Hushed by",
                    value: stringifyName(interaction.user),
                  },
                  { name: "Reason", value: reason.toString() }
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
      } catch (error) {}
    },
  };
}
