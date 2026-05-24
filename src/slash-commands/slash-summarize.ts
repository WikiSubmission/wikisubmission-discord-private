import { ApplicationCommandOptionType } from "discord.js";
import { WSlashCommand } from "../types/w-slash-command";
import {
  buildReuseResponse,
  createThreadSummary,
  getSummaryJumpUrl,
  planThreadSummary,
} from "../utils/thread-summary";

export default function Command(): WSlashCommand {
  return {
    name: "summarize",
    description: "Summarize the latest relevant part of the current thread.",
    access_control: "VERIFIED_AND_ABOVE",
    options: [
      {
        name: "extra_messages",
        description: "Expand the lookback window within safe limits.",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
      {
        name: "focus",
        description: "Optional angle or question to focus the summary on.",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
    execute: async (interaction) => {
      try {
        if (!interaction.isChatInputCommand()) {
          return;
        }

        const thread = interaction.channel;
        if (!thread || !thread.isThread()) {
          await interaction.reply({
            content: "`/summarize` can only be used inside a thread.",
            flags: ["Ephemeral"],
          });
          return;
        }

        await interaction.deferReply({ flags: ["Ephemeral"] });

        const extraMessages = interaction.options.get("extra_messages")?.value as
          | number
          | undefined;
        const focus = interaction.options.get("focus")?.value as string | undefined;
        const botUserId = interaction.client.user?.id;

        if (!botUserId) {
          throw new Error("Bot user ID is unavailable.");
        }

        const summaryPlan = await planThreadSummary(thread, botUserId, extraMessages);
        if (summaryPlan.kind === "reuse") {
          await interaction.editReply({
            content: buildReuseResponse(
              summaryPlan.summary,
              summaryPlan.newMessageCount
            ),
          });
          return;
        }

        if (summaryPlan.messages.length === 0) {
          if (summaryPlan.latestSummary) {
            await interaction.editReply({
              content: `No new thread content qualified for a refresh. Existing summary: ${getSummaryJumpUrl(summaryPlan.latestSummary.message)}`,
            });
            return;
          }

          await interaction.editReply({
            content: "No qualifying thread messages were found to summarize.",
          });
          return;
        }

        const { embed, usageSummary } = await createThreadSummary(
          thread,
          summaryPlan.messages,
          {
            focus,
            priorSummaryContext: summaryPlan.priorSummaryContext,
          }
        );

        const postedSummary = await thread.send({ embeds: [embed] });
        const summaryUrl = getSummaryJumpUrl(postedSummary);
        const boundaryNotes = [
          summaryPlan.topicBoundaryHit ? "topic boundary detected" : null,
          summaryPlan.hardCapHit ? "safety cap applied" : null,
          summaryPlan.latestSummary
            ? "built from new messages after the last summary"
            : null,
        ]
          .filter(Boolean)
          .join(" • ");

        await interaction.editReply({
          content: [
            `Posted summary: ${summaryUrl}`,
            usageSummary,
            boundaryNotes || null,
          ]
            .filter(Boolean)
            .join("\n"),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown summarize error.";

        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: `Failed to summarize this thread. ${message}`,
          });
          return;
        }

        await interaction.reply({
          content: `Failed to summarize this thread. ${message}`,
          flags: ["Ephemeral"],
        });
      }
    },
  };
}
