import { Task, TaskTrace } from "@hilda/db";
import type { ValidationGraphState } from "../../state/validationState";

export async function loadPatchTaskContextNode(
  state: ValidationGraphState,
): Promise<Partial<ValidationGraphState>> {
  const patchTask = await Task.findByPk(state.patchTaskId);

  if (!patchTask || patchTask.taskType !== "patch") {
    throw new Error("Patch task not found");
  }

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_validation_patch_context_loaded",
    eventDataJson: {
      patchTaskId: patchTask.id,
      patchTaskStatus: patchTask.status,
    },
  });

  return {};
}
