import { ApprovalRequest, Task, TaskTrace } from "@hilda/db";
import type { GeneratedPlan } from "../../state/planState";
import type { PatchGraphState } from "../../state/patchState";

export async function loadApprovedPlanNode(
  state: PatchGraphState,
): Promise<Partial<PatchGraphState>> {
  const approvedPlanTask = await Task.findByPk(state.approvedPlanTaskId);

  if (!approvedPlanTask || approvedPlanTask.taskType !== "plan") {
    throw new Error("Approved plan task not found");
  }

  const planApprovals = await ApprovalRequest.findAll({
    where: {
      taskId: approvedPlanTask.id,
      approvalType: "plan",
      status: "approved",
    },
  });

  if (planApprovals.length === 0) {
    throw new Error("Plan must be approved before drafting a patch");
  }

  const output = approvedPlanTask.output as { plan?: GeneratedPlan } | null;

  if (!output?.plan) {
    throw new Error("Approved plan output is missing");
  }

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_patch_plan_loaded",
    eventDataJson: {
      approvedPlanTaskId: approvedPlanTask.id,
      impactedFiles: output.plan.impactedFiles,
    },
  });

  return {
    planSummary: output.plan.summary,
    impactedFiles: output.plan.impactedFiles,
    steps: output.plan.steps,
  };
}
