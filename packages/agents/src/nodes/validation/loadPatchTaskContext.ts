import { PatchArtifact, Task, TaskTrace } from "@hilda/db";
import type { ValidationGraphState } from "../../state/validationState";

export async function loadPatchTaskContextNode(
  state: ValidationGraphState,
): Promise<Partial<ValidationGraphState>> {
  const patchTask = await Task.findByPk(state.patchTaskId);

  if (!patchTask || patchTask.taskType !== "patch") {
    throw new Error("Patch task not found");
  }

  const patchArtifact = await PatchArtifact.findOne({
    where: {
      taskId: patchTask.id,
      artifactType: "patch",
    },
    order: [["createdAt", "DESC"]],
  });

  if (!patchArtifact) {
    throw new Error("Patch artifact not found for validation");
  }

  const metadata = patchArtifact.metadataJson as {
    impactedFiles?: string[];
  };

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_validation_patch_context_loaded",
    eventDataJson: {
      patchTaskId: patchTask.id,
      patchTaskStatus: patchTask.status,
      patchArtifactId: patchArtifact.id,
    },
  });

  return {
    patchArtifactId: patchArtifact.id,
    patchDraft: patchArtifact.content,
    patchImpactedFiles: metadata.impactedFiles ?? [],
  };
}
