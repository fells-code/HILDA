import { END, START, StateGraph } from "@langchain/langgraph";
import { buildStructuredPlanNode } from "../nodes/plan/buildStructuredPlan";
import { createPlanApprovalNode } from "../nodes/plan/createPlanApproval";
import { loadPlanContextNode } from "../nodes/plan/loadPlanContext";
import { persistPlanResultNode } from "../nodes/plan/persistPlanResult";
import { retrievePlanEvidenceNode } from "../nodes/plan/retrievePlanEvidence";
import type { PlanGraphState } from "../state/planState";

export function createPlanGraph() {
  return new StateGraph<PlanGraphState>({
    channels: {
      taskId: null,
      workspaceId: null,
      userId: null,
      repositoryId: null,
      repositoryName: null,
      prompt: null,
      repoPath: null,
      filesScanned: null,
      matches: {
        value: (current, update) => update ?? current ?? [],
        default: () => [],
      },
      plan: null,
      approvalRequestId: null,
      error: null,
    },
  })
    .addNode("load_context", loadPlanContextNode)
    .addNode("retrieve_evidence", retrievePlanEvidenceNode)
    .addNode("build_plan", buildStructuredPlanNode)
    .addNode("create_approval", createPlanApprovalNode)
    .addNode("persist_result", persistPlanResultNode)
    .addEdge(START, "load_context")
    .addEdge("load_context", "retrieve_evidence")
    .addEdge("retrieve_evidence", "build_plan")
    .addEdge("build_plan", "create_approval")
    .addEdge("create_approval", "persist_result")
    .addEdge("persist_result", END)
    .compile();
}
