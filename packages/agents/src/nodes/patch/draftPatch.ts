import { TaskTrace } from "@hilda/db";
import { buildPatchDraft } from "../../lib/buildPatchDraft";
import type { PatchGraphState } from "../../state/patchState";

export async function draftPatchNode(
  state: PatchGraphState,
): Promise<Partial<PatchGraphState>> {
  if (!state.planSummary) {
    throw new Error("Plan summary is missing from graph state");
  }

  const patchDraft = buildPatchDraft(
    state.prompt,
    {
      summary: state.planSummary,
      impactedFiles: state.impactedFiles,
      steps: state.steps,
    },
    state.evidence,
  );

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_patch_drafted",
    eventDataJson: {
      impactedFiles: state.impactedFiles,
      evidenceCount: state.evidence.length,
    },
  });

  return {
    patchDraft,
  };
}
