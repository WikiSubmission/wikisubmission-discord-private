import { WEventListener } from "../types/w-event-listener";

export default function listener(): WEventListener {
  return {
    name: "guildCreate",
    handler: async (guild) => {
      console.log(
        `Bot added to guild: ${guild.name} (${guild.id}). Members: ${guild.memberCount}.`
      );
    },
  };
}
