import { Task, TaskTrace } from "@hilda/db";
import type { PlanGraphState } from "../../state/planState";

export async function persistPlanResultNode(
  state: PlanGraphState,
): Promise<Partial<PlanGraphState>> {
  const task = await Task.findByPk(state.taskId);

  if (!task) {
    throw new Error("Task not found while persisting plan result");
  }

  await task.update({
    status: "awaiting_approval",
    output: {
      plan: state.plan,
      approvalRequestId: state.approvalRequestId,
    },
  });

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_plan_persisted",
    eventDataJson: {
      status: "awaiting_approval",
      approvalRequestId: state.approvalRequestId,
    },
  });

  return {};
}
