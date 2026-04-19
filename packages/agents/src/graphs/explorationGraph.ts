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
  return new StateGraph<ExplorationGraphState>({
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
  })
    .addNode("load_context", loadExplorationContextNode)
    .addNode("classify_intent", classifyExplorationIntentNode)
    .addNode("gather_repo_metadata", gatherRepoMetadataNode)
    .addNode("gather_framework_evidence", gatherFrameworkEvidenceNode)
    .addNode("gather_docs_evidence", gatherDocsEvidenceNode)
    .addNode("gather_structure_evidence", gatherStructureEvidenceNode)
    .addNode("gather_execution_evidence", gatherExecutionEvidenceNode)
    .addNode("gather_testing_evidence", gatherTestingEvidenceNode)
    .addNode("gather_entrypoint_evidence", gatherEntrypointEvidenceNode)
    .addNode("synthesize_answer", synthesizeExplorationAnswerNode)
    .addNode("persist_result", persistExplorationResultNode)
    .addEdge(START, "load_context")
    .addEdge("load_context", "classify_intent")
    .addEdge("classify_intent", "gather_repo_metadata")
    .addEdge("gather_repo_metadata", "gather_framework_evidence")
    .addEdge("gather_framework_evidence", "gather_docs_evidence")
    .addEdge("gather_docs_evidence", "gather_structure_evidence")
    .addEdge("gather_structure_evidence", "gather_execution_evidence")
    .addEdge("gather_execution_evidence", "gather_testing_evidence")
    .addEdge("gather_testing_evidence", "gather_entrypoint_evidence")
    .addEdge("gather_entrypoint_evidence", "synthesize_answer")
    .addEdge("synthesize_answer", "persist_result")
    .addEdge("persist_result", END)
    .compile();
}
