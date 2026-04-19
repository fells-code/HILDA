import { END, START, StateGraph } from "@langchain/langgraph";
import { createPatchApprovalNode } from "../nodes/patch/createPatchApproval";
import { createPatchArtifactNode } from "../nodes/patch/createPatchArtifact";
import { draftPatchNode } from "../nodes/patch/draftPatch";
import { loadApprovedPlanNode } from "../nodes/patch/loadApprovedPlan";
import { loadPatchContextNode } from "../nodes/patch/loadPatchContext";
import { persistPatchResultNode } from "../nodes/patch/persistPatchResult";
import type { PatchGraphState } from "../state/patchState";

export function createPatchGraph() {
  return new StateGraph<PatchGraphState>({
    channels: {
      taskId: null,
      workspaceId: null,
      userId: null,
      repositoryId: null,
      repositoryName: null,
      prompt: null,
      approvedPlanTaskId: null,
      repoPath: null,
      planSummary: null,
      impactedFiles: {
        value: (current, update) => update ?? current ?? [],
        default: () => [],
      },
      steps: {
        value: (current, update) => update ?? current ?? [],
        default: () => [],
      },
      evidence: {
        value: (current, update) => update ?? current ?? [],
        default: () => [],
      },
      patchDraft: null,
      patchArtifactId: null,
      approvalRequestId: null,
      error: null,
    },
  })
    .addNode("load_context", loadPatchContextNode)
    .addNode("load_approved_plan", loadApprovedPlanNode)
    .addNode("draft_patch", draftPatchNode)
    .addNode("create_patch_artifact", createPatchArtifactNode)
    .addNode("create_patch_approval", createPatchApprovalNode)
    .addNode("persist_result", persistPatchResultNode)
    .addEdge(START, "load_context")
    .addEdge("load_context", "load_approved_plan")
    .addEdge("load_approved_plan", "draft_patch")
    .addEdge("draft_patch", "create_patch_artifact")
    .addEdge("create_patch_artifact", "create_patch_approval")
    .addEdge("create_patch_approval", "persist_result")
    .addEdge("persist_result", END)
    .compile();
}
