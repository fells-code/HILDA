import { TaskTrace } from "@hilda/db";
import { generatePatchDiff } from "../../lib/generatePatchDiff";
import type { PatchGraphState } from "../../state/patchState";

export async function draftPatchNode(
  state: PatchGraphState,
): Promise<Partial<PatchGraphState>> {
  if (!state.planSummary) {
    throw new Error("Plan summary is missing from graph state");
  }

  if (!state.repoPath) {
    throw new Error("Repository path is missing from graph state");
  }

  const result = await generatePatchDiff(
    state.prompt,
    {
      summary: state.planSummary,
      impactedFiles: state.impactedFiles,
      steps: state.steps,
    },
    state.evidence,
    state.repoPath,
  );

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_patch_drafted",
    eventDataJson: {
      impactedFiles: state.impactedFiles,
      evidenceCount: state.evidence.length,
      draftMode: result.metadata.mode,
      model: result.metadata.model ?? null,
      candidateFiles: result.metadata.candidateFiles,
    },
  });

  return {
    patchDraft: result.patchDraft,
    patchDraftMetadata: result.metadata,
  };
}
