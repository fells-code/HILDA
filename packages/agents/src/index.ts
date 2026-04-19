import { createAnalysisGraph } from "./graphs/analysisGraph";
import { createExplorationGraph } from "./graphs/explorationGraph";
import { createPatchGraph } from "./graphs/patchGraph";
import { createPlanGraph } from "./graphs/planGraph";
import { createQuestionGraph } from "./graphs/questionGraph";
import { createValidationGraph } from "./graphs/validationGraph";
import type { AnalysisGraphState } from "./state/analysisState";
import type { ExplorationGraphState } from "./state/explorationState";
import type { PatchGraphState } from "./state/patchState";
import type { PlanGraphState } from "./state/planState";
import type { QuestionGraphState } from "./state/questionState";
import type { ValidationGraphState } from "./state/validationState";

export async function runAnalysisGraph(input: AnalysisGraphState) {
  const graph = createAnalysisGraph();
  return graph.invoke(input);
}

export async function runExplorationGraph(input: ExplorationGraphState) {
  const graph = createExplorationGraph();
  return graph.invoke(input);
}

export async function runQuestionGraph(input: QuestionGraphState) {
  const graph = createQuestionGraph();
  return graph.invoke(input);
}

export async function runPlanGraph(input: PlanGraphState) {
  const graph = createPlanGraph();
  return graph.invoke(input);
}

export async function runPatchGraph(input: PatchGraphState) {
  const graph = createPatchGraph();
  return graph.invoke(input);
}

export async function runValidationGraph(input: ValidationGraphState) {
  const graph = createValidationGraph();
  return graph.invoke(input);
}

export type { AnalysisGraphState, AnalysisIntent } from "./state/analysisState";
export type { ExplorationGraphState, ExplorationIntent } from "./state/explorationState";
export type { PatchEvidence, PatchGraphState } from "./state/patchState";
export type {
  GeneratedPlan,
  PlanGraphState,
  PlanMatch,
} from "./state/planState";
export type { QuestionGraphState, QuestionMatch } from "./state/questionState";
export type {
  ValidationCommandResult,
  ValidationGraphState,
} from "./state/validationState";
