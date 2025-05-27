import { WEventListener } from "../types/w-event-listener";

export default function listener(): WEventListener {
    return {
        name: "guildDelete",
        handler: async (guild) => {
            console.log(`Bot removed from guild: ${guild.name} (${guild.id}). Members: ${guild.memberCount}.`)
        },
    };
}