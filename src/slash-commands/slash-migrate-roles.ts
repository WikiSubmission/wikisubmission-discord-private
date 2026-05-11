import { AttachmentBuilder, EmbedBuilder, Role } from "discord.js";
import { WSlashCommand } from "../types/w-slash-command";
import { logError } from "../utils/log-error";
import { stimulateDelay } from "../utils/stimulate-delay";

export default function Command(): WSlashCommand {
  return {
    name: "migrate-roles",
    description: "Move all users from one role to another with a CSV backup",
    options: [
      {
        name: "from-role",
        description: "The source role to move users from",
        type: 8, // Role type
        required: true,
      },
      {
        name: "to-role",
        description: "The primary destination role to move users to",
        type: 8, // Role type
        required: true,
      },
      {
        name: "to-role-2",
        description: "An optional second destination role to move users to",
        type: 8, // Role type
        required: false,
      },
    ],
    access_control: "MOD_AND_ABOVE",
    execute: async (interaction) => {
      if (!interaction.guild || !interaction.isChatInputCommand()) return;

      try {
        // [Defer reply]
        await interaction.deferReply({ flags: ["Ephemeral"] });

        // [Fetch roles]
        const fromRole = interaction.options.getRole("from-role") as Role;
        const toRole = interaction.options.getRole("to-role") as Role;
        const toRole2 = interaction.options.getRole("to-role-2") as Role | null;

        if (!fromRole || !toRole) {
          await interaction.editReply({
            content: "❌ One or both primary roles were not found.",
          });
          return;
        }

        // [Fetch all members to ensure cache is full]
        const allMembers = await interaction.guild.members.fetch();
        const membersWithRole = allMembers.filter((m) =>
          m.roles.cache.has(fromRole.id)
        );

        if (membersWithRole.size === 0) {
          await interaction.editReply({
            content: `No users found with role <@&${fromRole.id}>.`,
          });
          return;
        }

        // [Generate CSV backup]
        let csvContent = "User ID,Username,Display Name\n";
        membersWithRole.forEach((m) => {
          csvContent += `${m.id},"${m.user.username.replace(/"/g, '""')}","${m.displayName.replace(/"/g, '""')}"\n`;
        });

        const attachment = new AttachmentBuilder(Buffer.from(csvContent, "utf-8"), {
          name: `migration_backup_${fromRole.name.replace(/\s+/g, "_")}.csv`,
        });

        // [Perform migration]
        let successCount = 0;
        let failureCount = 0;

        for (const [id, member] of membersWithRole) {
          try {
            // Add first destination role if needed
            if (!member.roles.cache.has(toRole.id)) {
              await member.roles.add(toRole);
            }

            // Add second destination role if provided and needed
            if (toRole2 && !member.roles.cache.has(toRole2.id)) {
              await member.roles.add(toRole2);
            }
            
            // Always remove source role
            await member.roles.remove(fromRole);
            
            successCount++;
          } catch (error) {
            failureCount++;
            console.error(`Failed to migrate user ${member.user.tag}:`, error);
          }

          // Small delay to respect rate limits
          await stimulateDelay(50);
        }

        // [Final response]
        const embed = new EmbedBuilder()
          .setTitle("Role Migration Complete")
          .setDescription(
            `Successfully migrated users from <@&${fromRole.id}> to <@&${toRole.id}>${toRole2 ? ` and <@&${toRole2.id}>` : ""}.`
          )
          .addFields(
            { name: "Total Users Found", value: `${membersWithRole.size}`, inline: true },
            { name: "Successfully Migrated", value: `${successCount}`, inline: true },
            { name: "Failures", value: `${failureCount}`, inline: true }
          )
          .setColor(failureCount > 0 ? "Orange" : "Green")
          .setTimestamp();

        await interaction.editReply({
          embeds: [embed],
          files: [attachment],
        });

      } catch (error) {
        logError(error, __filename);
        if (interaction.deferred) {
          await interaction.editReply({
            content: "❌ An internal error occurred during migration.",
          });
        } else {
          await interaction.reply({
            content: "❌ An internal error occurred.",
            flags: ["Ephemeral"],
          });
        }
      }
    },
  };
}
