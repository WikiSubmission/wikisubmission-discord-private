import { Guild, GuildMember, Interaction, Message, Role } from "discord.js";
import { Bot } from "../bot/client";
import { SupportedGuilds } from "../constants/supported-guilds";

type AcceptableContexts = Interaction | GuildMember | Message | Guild;

export function getActualRoleName(name: string): string {
  return process.env.NODE_ENV === "production" ? name : `Test:${name}`;
}

export function getRole(
  name: string,
  context?: string | AcceptableContexts
): Role | null {
  const actualName = getActualRoleName(name);
  const matches = (role: Role) => role.name === actualName;

  if (context && typeof context !== "string") {
    if (context instanceof Guild) {
      const role = context.roles.cache.find(matches);
    } else {
      const role = context.guild?.roles.cache.find(matches);
      if (role) return role;
    }
  }

  if (!context || typeof context === "string") {
    const guildId =
      process.env.NODE_ENV === "production"
        ? SupportedGuilds.Production.id
        : SupportedGuilds.Development.id;

    const guild = Bot.client.guilds.cache.get(guildId);
    if (guild) {
      const role = guild.roles.cache.find(matches);
      if (role) return role;
    }
  }

  for (const guild of Bot.client.guilds.cache.values()) {
    const role = guild.roles.cache.find(matches);
    if (role) return role;
  }

  return null;
}

export function getRoles<T extends string>(
  names: readonly T[],
  context?: string | AcceptableContexts
): Record<T, Role> | null {
  const result = {} as Record<T, Role>;

  for (const name of names) {
    const role = getRole(name, context);
    if (!role) return null;
    result[name] = role;
  }

  return result;
}
