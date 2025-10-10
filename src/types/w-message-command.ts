import {
  MessageContextMenuCommandInteraction,
  RESTPostAPIBaseApplicationCommandsJSONBody,
  AutocompleteInteraction,
  CacheType,
  ApplicationCommandType,
} from 'discord.js'
import { WAccessControlCategories } from './w-access-control-categories'

export type WMessageCommand = Omit<
  RESTPostAPIBaseApplicationCommandsJSONBody,
  'description' | 'options' | 'type'
> & {
  execute: (interaction: MessageContextMenuCommandInteraction<CacheType>) => Promise<void>
  access_control?: WAccessControlCategories
  disabled_in_dm?: boolean
  type: ApplicationCommandType.Message
}
