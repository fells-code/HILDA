import { TaskTrace } from "@hilda/db";
import { summarizeMatches } from "../../lib/summarizeMatches";
import type { QuestionGraphState } from "../../state/questionState";

export async function synthesizeAnswerNode(
  state: QuestionGraphState,
): Promise<Partial<QuestionGraphState>> {
  const answer = summarizeMatches(
    state.question,
    state.matches,
    state.intent ?? "general",
  );

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_answer_synthesized",
    eventDataJson: {
      answerPreview: answer.slice(0, 200),
      matchCount: state.matches.length,
    },
  });

  return {
    answer,
  };
}
