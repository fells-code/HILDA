import { TaskTrace } from "@hilda/db";
import { generateExplorationAnswer } from "../../lib/generateExplorationAnswer";
import type { ExplorationGraphState } from "../../state/explorationState";

export async function synthesizeExplorationAnswerNode(
  state: ExplorationGraphState,
): Promise<Partial<ExplorationGraphState>> {
  if (!state.intent) {
    throw new Error("Exploration intent is missing from graph state");
  }

  const result = await generateExplorationAnswer({
    prompt: state.prompt,
    intent: state.intent,
    repositoryName: state.repositoryName,
    repoMetadata: state.repoMetadata,
    docsEvidence: state.docsEvidence,
    structureEvidence: state.structureEvidence,
    executionEvidence: state.executionEvidence,
    testingEvidence: state.testingEvidence,
    frameworkEvidence: state.frameworkEvidence,
    entrypointEvidence: state.entrypointEvidence,
  });

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_exploration_answer_synthesized",
    eventDataJson: {
      intent: state.intent,
      mode: result.mode,
      model: result.model ?? null,
      answerPreview: result.answer.slice(0, 220),
      evidenceCount: result.evidence.length,
    },
  });

  return {
    answer: result.answer,
    evidence: result.evidence,
    result: result.result,
    model: result.model,
  };
}
