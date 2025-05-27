import {
    CacheType,
    ChatInputApplicationCommandData,
    ChatInputCommandInteraction,
    CommandInteraction,
    MessageContextMenuCommandInteraction,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    UserContextMenuCommandInteraction,
} from 'discord.js';
import { WAccessControlCategories } from './w-access-control-categories';

export type WSlashCommand = RESTPostAPIChatInputApplicationCommandsJSONBody & {
    execute: (interaction: ChatInputCommandInteraction<CacheType> | MessageContextMenuCommandInteraction<CacheType> | UserContextMenuCommandInteraction) => Promise<void>;
    access_control?: WAccessControlCategories;
    disabled_in_dm?: boolean;
};
