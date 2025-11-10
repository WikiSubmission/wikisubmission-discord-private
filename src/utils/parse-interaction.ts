export function parseInteraction(interaction: any): string | null {
  if (
    interaction &&
    typeof interaction === "object" &&
    "commandName" in interaction &&
    "options" in interaction &&
    Array.isArray(interaction.options?.data) &&
    "user" in interaction &&
    "id" in interaction
  ) {
    const commandPart = `[${interaction.id}] /${interaction.commandName}`;
    const optionsPart =
      interaction.options.data.length > 0
        ? " " +
          interaction.options.data
            .map((i: any) => `[${i.name}:${i.value}]`)
            .join(" ")
        : "";
    const guildPart = interaction.guild
      ? `"${interaction.guild.name}" (${interaction.guild.id})`
      : "N.A.";
    const userPart = `@${interaction.user.username} (${interaction.user.id})`;

    return `${commandPart}${optionsPart} @ ${guildPart} / ${userPart}`;
  }

  return null;
}
