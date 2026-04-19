import { END, START, StateGraph } from "@langchain/langgraph";
import { loadQuestionContextNode } from "../nodes/question/loadQuestionContext";
import { persistQuestionResultNode } from "../nodes/question/persistQuestionResult";
import { retrieveEvidenceNode } from "../nodes/question/retrieveEvidence";
import { synthesizeAnswerNode } from "../nodes/question/synthesizeAnswer";
import type { QuestionGraphState } from "../state/questionState";

export function createQuestionGraph() {
  return new StateGraph<QuestionGraphState>({
    channels: {
      taskId: null,
      workspaceId: null,
      userId: null,
      repositoryId: null,
      repositoryName: null,
      question: null,
      intent: null,
      repoPath: null,
      filesScanned: null,
      matches: {
        value: (current, update) => update ?? current ?? [],
        default: () => [],
      },
      answer: null,
      error: null,
    },
  })
    .addNode("load_context", loadQuestionContextNode)
    .addNode("retrieve_evidence", retrieveEvidenceNode)
    .addNode("synthesize_answer", synthesizeAnswerNode)
    .addNode("persist_result", persistQuestionResultNode)
    .addEdge(START, "load_context")
    .addEdge("load_context", "retrieve_evidence")
    .addEdge("retrieve_evidence", "synthesize_answer")
    .addEdge("synthesize_answer", "persist_result")
    .addEdge("persist_result", END)
    .compile();
}
