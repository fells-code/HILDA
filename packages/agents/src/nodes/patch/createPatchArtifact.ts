import { PatchArtifact, TaskTrace } from "@hilda/db";
import type { PatchGraphState } from "../../state/patchState";

export async function createPatchArtifactNode(
  state: PatchGraphState,
): Promise<Partial<PatchGraphState>> {
  if (!state.patchDraft) {
    throw new Error("Patch draft is missing from graph state");
  }

  const artifact = await PatchArtifact.create({
    taskId: state.taskId,
    repositoryId: state.repositoryId,
    artifactType: "patch",
    title: `Draft patch for ${state.repositoryName ?? state.repositoryId}`,
    content: state.patchDraft,
    metadataJson: {
      prompt: state.prompt,
      impactedFiles: state.impactedFiles,
    },
  });

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_patch_artifact_created",
    eventDataJson: {
      artifactId: artifact.id,
      artifactType: "patch",
    },
  });

  return {
    patchArtifactId: artifact.id,
  };
}
