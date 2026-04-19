import { END, START, StateGraph } from "@langchain/langgraph";
import { classifyExplorationIntentNode } from "../nodes/exploration/classifyExplorationIntent";
import { gatherDocsEvidenceNode } from "../nodes/exploration/gatherDocsEvidence";
import { gatherEntrypointEvidenceNode } from "../nodes/exploration/gatherEntrypointEvidence";
import { gatherExecutionEvidenceNode } from "../nodes/exploration/gatherExecutionEvidence";
import { gatherFrameworkEvidenceNode } from "../nodes/exploration/gatherFrameworkEvidence";
import { gatherRepoMetadataNode } from "../nodes/exploration/gatherRepoMetadata";
import { gatherStructureEvidenceNode } from "../nodes/exploration/gatherStructureEvidence";
import { gatherTestingEvidenceNode } from "../nodes/exploration/gatherTestingEvidence";
import { loadExplorationContextNode } from "../nodes/exploration/loadExplorationContext";
import { persistExplorationResultNode } from "../nodes/exploration/persistExplorationResult";
import { synthesizeExplorationAnswerNode } from "../nodes/exploration/synthesizeExplorationAnswer";
import type { ExplorationGraphState } from "../state/explorationState";

export function createExplorationGraph() {
  const graph = new StateGraph<ExplorationGraphState>({
    channels: {
      taskId: null,
      workspaceId: null,
      userId: null,
      repositoryId: null,
      repositoryName: null,
      prompt: null,
      intentHint: null,
      intent: null,
      repoPath: null,
      repoFiles: null,
      repoMetadata: null,
      docsEvidence: null,
      structureEvidence: null,
      executionEvidence: null,
      testingEvidence: null,
      frameworkEvidence: null,
      entrypointEvidence: null,
      answer: null,
      evidence: {
        value: (current, update) => update ?? current ?? [],
        default: () => [],
      },
      result: null,
      model: null,
      error: null,
    },
  });

  graph.addNode("load_context", loadExplorationContextNode);
  graph.addNode("classify_intent", classifyExplorationIntentNode);
  graph.addNode("gather_repo_metadata", gatherRepoMetadataNode);
  graph.addNode("gather_framework_evidence", gatherFrameworkEvidenceNode);
  graph.addNode("gather_docs_evidence", gatherDocsEvidenceNode);
  graph.addNode("gather_structure_evidence", gatherStructureEvidenceNode);
  graph.addNode("gather_execution_evidence", gatherExecutionEvidenceNode);
  graph.addNode("gather_testing_evidence", gatherTestingEvidenceNode);
  graph.addNode("gather_entrypoint_evidence", gatherEntrypointEvidenceNode);
  graph.addNode("synthesize_answer", synthesizeExplorationAnswerNode);
  graph.addNode("persist_result", persistExplorationResultNode);

  graph.addEdge(START, "load_context");
  graph.addEdge("load_context", "classify_intent");
  graph.addEdge("classify_intent", "gather_repo_metadata");
  graph.addEdge("gather_repo_metadata", "gather_framework_evidence");
  graph.addEdge("gather_framework_evidence", "gather_docs_evidence");
  graph.addEdge("gather_docs_evidence", "gather_structure_evidence");
  graph.addEdge("gather_structure_evidence", "gather_execution_evidence");
  graph.addEdge("gather_execution_evidence", "gather_testing_evidence");
  graph.addEdge("gather_testing_evidence", "gather_entrypoint_evidence");
  graph.addEdge("gather_entrypoint_evidence", "synthesize_answer");
  graph.addEdge("synthesize_answer", "persist_result");
  graph.addEdge("persist_result", END);

  return graph.compile();
}
