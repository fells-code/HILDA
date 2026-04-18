import { Task, TaskTrace } from "@hilda/db";
import type { PatchGraphState } from "../../state/patchState";

export async function persistPatchResultNode(
  state: PatchGraphState,
): Promise<Partial<PatchGraphState>> {
  const task = await Task.findByPk(state.taskId);

  if (!task) {
    throw new Error("Task not found while persisting patch result");
  }

  await task.update({
    status: "awaiting_approval",
    output: {
      patchArtifactId: state.patchArtifactId,
      approvalRequestId: state.approvalRequestId,
    },
  });

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_patch_persisted",
    eventDataJson: {
      status: "awaiting_approval",
      patchArtifactId: state.patchArtifactId,
      approvalRequestId: state.approvalRequestId,
    },
  });

  return {};
}
