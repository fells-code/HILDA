import { END, START, StateGraph } from "@langchain/langgraph";
import { buildStructuredPlanNode } from "../nodes/plan/buildStructuredPlan";
import { createPlanApprovalNode } from "../nodes/plan/createPlanApproval";
import { loadPlanContextNode } from "../nodes/plan/loadPlanContext";
import { persistPlanResultNode } from "../nodes/plan/persistPlanResult";
import { retrievePlanEvidenceNode } from "../nodes/plan/retrievePlanEvidence";
import type { PlanGraphState } from "../state/planState";

export function createPlanGraph() {
  const graph = new StateGraph<PlanGraphState>({
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
  });

  graph.addNode("load_context", loadPlanContextNode);
  graph.addNode("retrieve_evidence", retrievePlanEvidenceNode);
  graph.addNode("build_plan", buildStructuredPlanNode);
  graph.addNode("create_approval", createPlanApprovalNode);
  graph.addNode("persist_result", persistPlanResultNode);

  graph.addEdge(START, "load_context");
  graph.addEdge("load_context", "retrieve_evidence");
  graph.addEdge("retrieve_evidence", "build_plan");
  graph.addEdge("build_plan", "create_approval");
  graph.addEdge("create_approval", "persist_result");
  graph.addEdge("persist_result", END);

  return graph.compile();
}
