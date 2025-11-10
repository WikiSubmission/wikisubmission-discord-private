import { EmbedBuilder } from "discord.js";
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
        description: "User to clear",
        type: 6,
        required: true,
      },
    ],
    access_control: "MOD_AND_ABOVE",
    execute: async (interaction) => {
      try {
        // [Fetch suspect]
        const suspectID = interaction.options.get("user")?.value;
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

        const hushRole = getRole("Hush");
        if (!hushRole) {
          console.error("Cannot find Hush role");
          interaction.reply({
            content: "Cannot find Hush role. Please contact a developer.",
            flags: ["Ephemeral"],
          });
          return;
        }
        if (!suspect.roles.cache.has(hushRole.id)) {
          interaction.reply({
            content: "User is not in slowdown mode.",
            flags: "Ephemeral",
          });
          return;
        } else {
          suspect.roles.remove(hushRole);
          const staffLog = getChannel("staff-log", "text", interaction);
          if (!staffLog) {
            console.error("staff-log channel does not exist. Please recreate.");
            const dev = getRole("Developer", interaction);
            interaction.reply({
              content: dev
                ? `<@&${dev.id}> The \`staff-log\` channel does not exist. Unhush command logging failed, command succeded.`
                : "The `staff-log` channel does not exist. User unhushed, cannot log it. Please contact a Developer (Developer role not found).",
            });
          } else {
            interaction.reply({
              content: "User has been released!",
              flags: "Ephemeral",
            });
            staffLog.send({
              content: `<@${suspect.user.id}> has been unhushed.`,
              embeds: [
                new EmbedBuilder()
                  .addFields(
                    {
                      name: "User",
                      value: stringifyName(suspect),
                    },
                    {
                      name: "Released by",
                      value: stringifyName(interaction.user),
                    }
                  )
                  .setFooter({
                    text: `${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL(),
                  })
                  .setTimestamp(Date.now())
                  .setThumbnail(suspect.displayAvatarURL())
                  .setColor("DarkGreen"),
              ],
            });
          }
        }
      } catch (error) {}
    },
  };
}
