import { PatchArtifact, TaskTrace } from "@hilda/db";
import { renderValidationReport } from "../../lib/renderValidationReport";
import type { ValidationGraphState } from "../../state/validationState";

export async function createValidationArtifactNode(
  state: ValidationGraphState,
): Promise<Partial<ValidationGraphState>> {
  const content = renderValidationReport(state.commandResults);

  const artifact = await PatchArtifact.create({
    taskId: state.taskId,
    repositoryId: state.repositoryId,
    artifactType: "validation_report",
    title: `Validation report for ${state.repositoryName ?? state.repositoryId}`,
    content,
    metadataJson: {
      commandsRun: state.commandResults.map((result) => result.command),
      success: state.success ?? false,
    },
  });

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_validation_artifact_created",
    eventDataJson: {
      artifactId: artifact.id,
      commandsRun: state.commandResults.map((result) => result.command),
    },
  });

  return {
    validationArtifactId: artifact.id,
  };
}
