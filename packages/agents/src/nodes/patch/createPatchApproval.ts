import { ApprovalRequest, TaskTrace } from "@hilda/db";
import type { PatchGraphState } from "../../state/patchState";

export async function createPatchApprovalNode(
  state: PatchGraphState,
): Promise<Partial<PatchGraphState>> {
  if (!state.patchArtifactId) {
    throw new Error("Patch artifact id is missing from graph state");
  }

  const approval = await ApprovalRequest.create({
    taskId: state.taskId,
    approvalType: "patch",
    summary: `Approve patch draft for: ${state.prompt}`,
    payloadJson: {
      patchArtifactId: state.patchArtifactId,
    },
    status: "pending",
  });

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_patch_approval_created",
    eventDataJson: {
      approvalRequestId: approval.id,
      patchArtifactId: state.patchArtifactId,
    },
  });

  return {
    approvalRequestId: approval.id,
  };
}
