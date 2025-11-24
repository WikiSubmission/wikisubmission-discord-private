import { WEventListener } from "../types/w-event-listener";
import { getRole } from "../utils/get-role";

export default function listener(): WEventListener {
  return {
    name: "messageCreate",
    handler: async (message) => {
      try {
        // Ignore bot messages or DMs
        if (!message.guild || message.author.bot) return;

        const member = await message.guild.members.fetch(message.author.id);

        // Find "New Member" role (or one that starts with "New Member")
        const newMemberRole =
          getRole("New Member", member) ||
          member.guild.roles.cache.find((r) => r.name.startsWith("New Member"));

        if (!newMemberRole) return;

        // Check if member has the role
        const isNewMember = member.roles.cache.has(newMemberRole.id);
        if (!isNewMember) return;

        // ---- RULES TO BLOCK ----

        const hasAttachment = message.attachments.size > 0;
        const hasEmbeds = message.embeds.length > 0;
        const hasLink = /(https?:\/\/[^\s]+)/gi.test(message.content ?? "");

        if (!hasAttachment && !hasEmbeds && !hasLink) return;

        // ---- DELETE THE MESSAGE ----
        await message.delete().catch(() => null);

        // ---- WARN THE USER ----
        await message.author
          .send({
            content: `Peace **${message.author.username}**,
You currently have the **New Member** role, sending **images, videos, attachments, embeds, or links** is temporarily disabled.

These restrictions will be lifted automatically 3 days after joining. Please be patient. Thank you.

Contact a mod if you have any questions.`,
          })
          .catch(() => null); // user DMs closed
      } catch (err) {
        console.error("Error in messageCreate listener:", err);
      }
    },
  };
}
