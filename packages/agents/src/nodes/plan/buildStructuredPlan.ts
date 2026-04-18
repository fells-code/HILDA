import { TaskTrace } from "@hilda/db";
import { generatePlanWithLLM } from "../../lib/generatePlanWithLLM";
import type { PlanGraphState } from "../../state/planState";

export async function buildStructuredPlanNode(
  state: PlanGraphState,
): Promise<Partial<PlanGraphState>> {
  const result = await generatePlanWithLLM(state.prompt, state.matches);

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_plan_built",
    eventDataJson: {
      summary: result.plan.summary,
      impactedFiles: result.plan.impactedFiles,
      plannerMode: result.mode,
      model: result.model ?? null,
    },
  });

  return {
    plan: result.plan,
  };
}
