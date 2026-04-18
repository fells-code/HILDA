import { END, START, StateGraph } from "@langchain/langgraph";
import { loadQuestionContextNode } from "../nodes/question/loadQuestionContext";
import { persistQuestionResultNode } from "../nodes/question/persistQuestionResult";
import { retrieveEvidenceNode } from "../nodes/question/retrieveEvidence";
import { synthesizeAnswerNode } from "../nodes/question/synthesizeAnswer";
import type { QuestionGraphState } from "../state/questionState";

export function createQuestionGraph() {
  const graph = new StateGraph<QuestionGraphState>({
    channels: {
      taskId: null,
      workspaceId: null,
      userId: null,
      repositoryId: null,
      repositoryName: null,
      question: null,
      repoPath: null,
      filesScanned: null,
      matches: {
        value: (current, update) => update ?? current ?? [],
        default: () => [],
      },
      answer: null,
      error: null,
    },
  });

  graph.addNode("load_context", loadQuestionContextNode);
  graph.addNode("retrieve_evidence", retrieveEvidenceNode);
  graph.addNode("synthesize_answer", synthesizeAnswerNode);
  graph.addNode("persist_result", persistQuestionResultNode);

  graph.addEdge(START, "load_context");
  graph.addEdge("load_context", "retrieve_evidence");
  graph.addEdge("retrieve_evidence", "synthesize_answer");
  graph.addEdge("synthesize_answer", "persist_result");
  graph.addEdge("persist_result", END);

  return graph.compile();
}
