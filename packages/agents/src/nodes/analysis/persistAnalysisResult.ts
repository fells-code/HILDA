import { Task, TaskTrace } from "@hilda/db";
import type { AnalysisGraphState } from "../../state/analysisState";

export async function persistAnalysisResultNode(
  state: AnalysisGraphState,
): Promise<Partial<AnalysisGraphState>> {
  const task = await Task.findByPk(state.taskId);

  if (!task) {
    throw new Error("Task not found while persisting analysis result");
  }

  await task.update({
    status: "completed",
    output: (state.result ?? null) as Record<string, unknown> | null,
  });

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_analysis_persisted",
    eventDataJson: {
      status: "completed",
      title: state.result?.title ?? null,
    },
  });

  return {};
}
