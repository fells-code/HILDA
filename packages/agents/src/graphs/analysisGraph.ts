import { END, START, StateGraph } from "@langchain/langgraph";
import { loadAnalysisContextNode } from "../nodes/analysis/loadAnalysisContext";
import { persistAnalysisResultNode } from "../nodes/analysis/persistAnalysisResult";
import { runAnalysisNode } from "../nodes/analysis/runAnalysis";
import type { AnalysisGraphState } from "../state/analysisState";

export function createAnalysisGraph() {
  const graph = new StateGraph<AnalysisGraphState>({
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
  });

  graph.addNode("load_context", loadAnalysisContextNode);
  graph.addNode("run_analysis", runAnalysisNode);
  graph.addNode("persist_result", persistAnalysisResultNode);

  graph.addEdge(START, "load_context");
  graph.addEdge("load_context", "run_analysis");
  graph.addEdge("run_analysis", "persist_result");
  graph.addEdge("persist_result", END);

  return graph.compile();
}
