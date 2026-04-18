import { Task, TaskTrace } from "@hilda/db";
import type { QuestionGraphState } from "../../state/questionState";

export async function persistQuestionResultNode(
  state: QuestionGraphState,
): Promise<Partial<QuestionGraphState>> {
  const task = await Task.findByPk(state.taskId);

  if (!task) {
    throw new Error("Task not found while persisting question result");
  }

  await task.update({
    status: "completed",
    output: {
      answer: state.answer,
      matchCount: state.matches.length,
      filesScanned: state.filesScanned ?? 0,
    },
  });

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_question_persisted",
    eventDataJson: {
      status: "completed",
      matchCount: state.matches.length,
    },
  });

  return {};
}
