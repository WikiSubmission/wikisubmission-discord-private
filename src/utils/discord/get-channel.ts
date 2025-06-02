import {
    GuildBan,
    GuildBasedChannel,
    GuildMember,
    GuildScheduledEvent,
    GuildTextBasedChannel,
    Interaction,
    Message,
    PartialGuildMember,
    VoiceChannel,
} from "discord.js";
import { Bot } from "../../bot/client";
import { SupportedGuilds } from "../../constants/supported-guilds";

type AcceptableContexts = Interaction | GuildMember | PartialGuildMember | Message | GuildScheduledEvent | GuildBan;

export function getChannel<K extends 'text' | 'voice'>(
    name: string,
    type: K = 'text' as K,
    context?: string | AcceptableContexts,
): (
    K extends 'text'
        ? GuildTextBasedChannel
        : K extends 'voice'
        ? VoiceChannel
        : never
) | null {
    const matches = (channel: GuildBasedChannel) => {
        const matchesName = channel.name === name;
        const matchesType =
            (type === 'text' && 'send' in channel) ||
            (type === 'voice' && channel.type === 2);
        return matchesName && matchesType;
    };

    if (context && typeof context !== "string") {
        const ch = context.guild?.channels.cache.find(matches);
        if (ch) return ch as any;
    }

    if (!context || typeof context === "string") {
        const guildId = process.env.NODE_ENV === "production"
            ? SupportedGuilds.Production.id
            : SupportedGuilds.Development.id;

        const guild = Bot.client.guilds.cache.get(guildId);
        if (guild) {
            const ch = guild.channels.cache.find(matches);
            if (ch) return ch as any;
        }
    }

    for (const guild of Bot.client.guilds.cache.values()) {
        const ch = guild.channels.cache.find(matches);
        if (ch) return ch as any;
    }

    return null;
}

export function getChannels<
    T extends string,
    K extends 'text' | 'voice' = 'text'
>(
    names: readonly T[],
    type: K = 'text' as K,
    context?: string | AcceptableContexts,
): Record<
    T,
    K extends 'text'
        ? GuildTextBasedChannel
        : K extends 'voice'
        ? VoiceChannel
        : never
> | null {
    const result = {} as Record<
        T,
        K extends 'text'
            ? GuildTextBasedChannel
            : K extends 'voice'
            ? VoiceChannel
            : never
    >;

    for (const name of names) {
        const channel = getChannel(name, type, context);
        if (!channel) return null;
        result[name] = channel as typeof result[T];
    }

    return result;
}