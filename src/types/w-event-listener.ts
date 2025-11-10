import { Awaitable, ClientEvents } from "discord.js";

export type WEventListener = {
  [E in keyof ClientEvents]: {
    name: E;
    handler: (...args: ClientEvents[E]) => Awaitable<void>;
    log?: string;
    once?: boolean;
  };
}[keyof ClientEvents];
