import { ApprovalRequest, TaskTrace } from "@hilda/db";
import type { PlanGraphState } from "../../state/planState";

export async function createPlanApprovalNode(
  state: PlanGraphState,
): Promise<Partial<PlanGraphState>> {
  if (!state.plan) {
    throw new Error("Plan is missing from graph state");
  }

  const approval = await ApprovalRequest.create({
    taskId: state.taskId,
    approvalType: "plan",
    summary: `Approve plan for: ${state.prompt}`,
    payloadJson: {
      plan: state.plan,
    },
    status: "pending",
  });

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_plan_approval_created",
    eventDataJson: {
      approvalRequestId: approval.id,
      approvalType: "plan",
    },
  });

  return {
    approvalRequestId: approval.id,
  };
}
