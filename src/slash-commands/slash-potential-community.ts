import { WSlashCommand } from "../types/w-slash-command";
import { getRole } from "../utils/get-role";
import { stringifyName } from "../utils/stringify-name";
import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";

export default function Command(): WSlashCommand {
  return {
    name: "potential-community",
    description: "Finds people with the @Submitter role but without Community.",
    access_control: "MOD_AND_ABOVE",
    options: [
      {
        name: "limit",
        description: "How many users to show",
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: [
          { name: "10", value: "10" },
          { name: "20", value: "20" },
          { name: "50", value: "50" },
          { name: "All", value: "all" },
        ],
      },
    ],
    execute: async (interaction) => {
      try {
        if (!interaction.guild) {
          interaction.reply({
            content: "This command can only be used in a server.",
            flags: ["Ephemeral"],
          });
          return;
        }

        const submitterRole = getRole("Submitter", interaction);
        const communityRole = getRole("Community", interaction);

        if (!submitterRole) {
          interaction.reply({
            content: "Cannot find the Submitter role.",
            flags: ["Ephemeral"],
          });
          return;
        }

        if (!communityRole) {
          interaction.reply({
            content: "Cannot find the Community role.",
            flags: ["Ephemeral"],
          });
          return;
        }

        let limit = interaction.options.get("limit")?.value || "50";
        if (limit !== "all") limit = Number(limit);
        await interaction.guild.members.fetch();
        // Filter members with Submitter role but without Community role
        let membersWithoutCommunity = interaction.guild.members.cache
          .filter(
            (member) =>
              !member.user.bot &&
              member.roles.cache.has(submitterRole.id) &&
              !member.roles.cache.has(communityRole.id)
          )
          .sort((a, b) => (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0)); // Most recent join first

        if (membersWithoutCommunity.size === 0) {
          interaction.reply({
            content: "No submitters without the Community role were found.",
            flags: ["Ephemeral"],
          });
          return;
        }

        // Limit members
        // Convert Collection to array first
        const displayMembersArray =
          limit === "all"
            ? Array.from(membersWithoutCommunity.values())
            : Array.from(membersWithoutCommunity.values()).slice(
                0,
                limit as number
              );

        // Map safely
        const memberList = displayMembersArray
          .map((m: any) => stringifyName(m))
          .join("\n");

        const embed = new EmbedBuilder()
          .setTitle("Submitters without Community role")
          .setDescription(memberList)
          .setColor("Orange")
          .setFooter({
            text: `Total: ${membersWithoutCommunity.size}${
              limit !== "all" &&
              membersWithoutCommunity.size > (limit as number)
                ? ` | Showing first ${limit}`
                : ""
            }`,
          })
          .setTimestamp();

        interaction.reply({
          embeds: [embed],
          flags: ["Ephemeral"],
        });
        return;
      } catch (err) {
        console.error(err);
        interaction.reply({
          content: "An error occurred while fetching members.",
          flags: ["Ephemeral"],
        });
        return;
      }
    },
  };
}
