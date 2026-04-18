import { END, START, StateGraph } from "@langchain/langgraph";
import { createPatchApprovalNode } from "../nodes/patch/createPatchApproval";
import { createPatchArtifactNode } from "../nodes/patch/createPatchArtifact";
import { draftPatchNode } from "../nodes/patch/draftPatch";
import { loadApprovedPlanNode } from "../nodes/patch/loadApprovedPlan";
import { loadPatchContextNode } from "../nodes/patch/loadPatchContext";
import { persistPatchResultNode } from "../nodes/patch/persistPatchResult";
import type { PatchGraphState } from "../state/patchState";

export function createPatchGraph() {
  const graph = new StateGraph<PatchGraphState>({
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
  });

  graph.addNode("load_context", loadPatchContextNode);
  graph.addNode("load_approved_plan", loadApprovedPlanNode);
  graph.addNode("draft_patch", draftPatchNode);
  graph.addNode("create_patch_artifact", createPatchArtifactNode);
  graph.addNode("create_patch_approval", createPatchApprovalNode);
  graph.addNode("persist_result", persistPatchResultNode);

  graph.addEdge(START, "load_context");
  graph.addEdge("load_context", "load_approved_plan");
  graph.addEdge("load_approved_plan", "draft_patch");
  graph.addEdge("draft_patch", "create_patch_artifact");
  graph.addEdge("create_patch_artifact", "create_patch_approval");
  graph.addEdge("create_patch_approval", "persist_result");
  graph.addEdge("persist_result", END);

  return graph.compile();
}
