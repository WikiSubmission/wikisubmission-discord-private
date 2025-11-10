import { GuildMember, APIInteractionGuildMember } from 'discord.js';
import { Bot } from '../bot/client';
import { WAccessControlCategories } from '../types/w-access-control-categories';

// Simplified authentication as it is only used in trusted guilds. May enhance later.
export function authenticateMember(
  member: GuildMember | APIInteractionGuildMember | null,
  accessControlList: WAccessControlCategories,
): boolean {
  if (!member || !member.roles) return false;

  const roles =
    member instanceof GuildMember
      ? new Set(member.roles.cache.map((r) => r.name))
      : new Set(member.roles);

  if (member?.user.id === Bot.client.user?.id) return true;

  let requiredRoles: Set<string> = new Set();

  // Determine required roles
  switch (accessControlList) {
    case 'VERIFIED_AND_ABOVE':
      requiredRoles.add('Verified');
      requiredRoles.add('Insider');
      requiredRoles.add('Mod');
      requiredRoles.add('Moderator');
      requiredRoles.add('Admin');
      requiredRoles.add('Administrator');
      requiredRoles.add('Developer');
      break;

    case 'INSIDER_AND_ABOVE':
      requiredRoles.add('Insider');
      requiredRoles.add('Mod');
      requiredRoles.add('Moderator');
      requiredRoles.add('Admin');
      requiredRoles.add('Administrator');
      requiredRoles.add('Developer');
      break;

    case 'MOD_AND_ABOVE':
      requiredRoles.add('Mod');
      requiredRoles.add('Moderator');
      requiredRoles.add('Admin');
      requiredRoles.add('Administrator');
      requiredRoles.add('Developer');
      break;

    case 'ADMIN':
      requiredRoles.add('Admin');
      requiredRoles.add('Administrator');
      requiredRoles.add('Developer');
      break;

    default:
      // Validate against a custom string array
      if (Array.isArray(accessControlList)) {
        requiredRoles = new Set(accessControlList);
      }
      break;
  }

  return Array.from(roles).some((roleId) => requiredRoles.has(roleId));
}
