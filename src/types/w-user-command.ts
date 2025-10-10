import {
  UserContextMenuCommandInteraction,
  RESTPostAPIBaseApplicationCommandsJSONBody,
  CacheType,
  ApplicationCommandType,
} from 'discord.js'
import { WAccessControlCategories } from './w-access-control-categories'

export type WUserCommand = Omit<
  RESTPostAPIBaseApplicationCommandsJSONBody,
  'description' | 'options' | 'type'
> & {
  execute: (interaction: UserContextMenuCommandInteraction<CacheType>) => Promise<void>
  access_control?: WAccessControlCategories
  disabled_in_dm?: boolean
  type: ApplicationCommandType.User
}
