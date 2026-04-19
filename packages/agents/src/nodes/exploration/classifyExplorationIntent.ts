import { TaskTrace } from "@hilda/db";
import { classifyExplorationIntent } from "../../lib/explorationIntent";
import type { ExplorationGraphState } from "../../state/explorationState";

export async function classifyExplorationIntentNode(
  state: ExplorationGraphState,
): Promise<Partial<ExplorationGraphState>> {
  const intent = classifyExplorationIntent(state.prompt, state.intentHint);

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_exploration_intent_classified",
    eventDataJson: {
      prompt: state.prompt,
      intent,
      intentHint: state.intentHint ?? null,
    },
  });

  return {
    intent,
  };
}
