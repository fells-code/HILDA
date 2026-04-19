import { Task, TaskTrace } from "@hilda/db";
import type { ExplorationGraphState } from "../../state/explorationState";

export async function persistExplorationResultNode(
  state: ExplorationGraphState,
): Promise<Partial<ExplorationGraphState>> {
  const task = await Task.findByPk(state.taskId);

  if (!task) {
    throw new Error("Task not found while persisting exploration result");
  }

  await task.update({
    status: "completed",
    output: (state.result ?? {
      answer: state.answer ?? "",
      evidence: state.evidence ?? [],
      intent: state.intent ?? null,
    }) as Record<string, unknown>,
  });

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_exploration_persisted",
    eventDataJson: {
      status: "completed",
      intent: state.intent ?? null,
      title: state.result?.title ?? null,
    },
  });

  return {};
}
