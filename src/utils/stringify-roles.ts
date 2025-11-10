import { GuildMember, PartialGuildMember } from "discord.js";

export function stringifyRoles(
  context: GuildMember | PartialGuildMember | null
): string {
  if (!context) return "None";
  if (context instanceof GuildMember || "roles" in context) {
    return (
      context.roles?.cache
        ?.filter((i) => i.name !== "@everyone")
        ?.map((i) => `<@&${i.id}>`)
        ?.join(", ") || "None"
    );
  } else {
    return "None";
  }
}
