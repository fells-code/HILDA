import { END, START, StateGraph } from "@langchain/langgraph";
import { loadAnalysisContextNode } from "../nodes/analysis/loadAnalysisContext";
import { persistAnalysisResultNode } from "../nodes/analysis/persistAnalysisResult";
import { runAnalysisNode } from "../nodes/analysis/runAnalysis";
import type { AnalysisGraphState } from "../state/analysisState";

export function createAnalysisGraph() {
  return new StateGraph<AnalysisGraphState>({
    channels: {
      taskId: null,
      workspaceId: null,
      userId: null,
      repositoryId: null,
      repositoryName: null,
      prompt: null,
      intent: null,
      repoPath: null,
      result: null,
      error: null,
    },
  })
    .addNode("load_context", loadAnalysisContextNode)
    .addNode("run_analysis", runAnalysisNode)
    .addNode("persist_result", persistAnalysisResultNode)
    .addEdge(START, "load_context")
    .addEdge("load_context", "run_analysis")
    .addEdge("run_analysis", "persist_result")
    .addEdge("persist_result", END)
    .compile();
}
