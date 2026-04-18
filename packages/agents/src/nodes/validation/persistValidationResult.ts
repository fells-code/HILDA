import { Task, TaskTrace } from "@hilda/db";
import type { ValidationGraphState } from "../../state/validationState";

export async function persistValidationResultNode(
  state: ValidationGraphState,
): Promise<Partial<ValidationGraphState>> {
  const task = await Task.findByPk(state.taskId);

  if (!task) {
    throw new Error("Task not found while persisting validation result");
  }

  await task.update({
    status: state.success ? "completed" : "failed",
    output: {
      validationArtifactId: state.validationArtifactId,
      success: state.success ?? false,
    },
  });

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_validation_persisted",
    eventDataJson: {
      status: state.success ? "completed" : "failed",
      validationArtifactId: state.validationArtifactId,
      success: state.success ?? false,
    },
  });

  return {};
}
