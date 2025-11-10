import {
  GuildMember,
  User,
  GuildBan,
  APIInteractionGuildMember,
} from "discord.js";

export function stringifyName(
  member: APIInteractionGuildMember | GuildMember | User | GuildBan | null,
  omitTag?: boolean
): string {
  if (!member) return "--";
  else if (member instanceof User) {
    return `${omitTag ? "" : `<@${member.id}> `}(${member.username}${
      member.displayName === member.username ? `)` : ` / ${member.displayName})`
    }`;
  } else if (member instanceof GuildMember || member instanceof GuildBan) {
    return `${omitTag ? "" : `<@${member.user.id}> `} (${member.user.username}${
      member.user.displayName === member.user.username
        ? `)`
        : ` / ${member.user.displayName})`
    }`;
  } else if ("user" in member) {
    return `${omitTag ? "" : `<@${member.user.id}> `} (${member.user.username}`;
  } else {
    return `--`;
  }
}
