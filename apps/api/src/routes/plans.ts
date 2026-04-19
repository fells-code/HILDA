import { Router } from "express";
import { z } from "zod";
import {
  ApprovalRequest,
  Repository,
  Task,
  TaskTrace,
  Workspace,
} from "@hilda/db";
import { runPlanGraph } from "@hilda/agents";
import { requireAuthUser } from "../middleware/devAuth";

const router = Router();

const createPlanSchema = z.object({
  repositoryId: z.string().uuid(),
  prompt: z.string().trim().min(1).max(1000),
});

const approvePlanSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

router.post("/plans", async (req, res, next) => {
  let task: Task | null = null;

  try {
    const authUser = requireAuthUser(req);
    const parsed = createPlanSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: "Invalid plan payload",
        details: parsed.error.flatten(),
      });
      return;
    }

    const repository = await Repository.findByPk(parsed.data.repositoryId);

    if (!repository) {
      res.status(404).json({
        ok: false,
        error: "Repository not found",
      });
      return;
    }

    const workspace = await Workspace.findOne({
      where: {
        id: repository.workspaceId,
        ownerId: authUser.id,
      },
    });

    if (!workspace) {
      res.status(404).json({
        ok: false,
        error: "Repository not found",
      });
      return;
    }

    if (repository.status !== "indexed") {
      res.status(400).json({
        ok: false,
        error: "Repository is not indexed yet",
      });
      return;
    }

    task = await Task.create({
      workspaceId: workspace.id,
      userId: authUser.id,
      primaryRepositoryId: repository.id,
      taskType: "plan",
      status: "running",
      input: {
        prompt: parsed.data.prompt,
      },
    });

    await TaskTrace.create({
      taskId: task.id,
      eventType: "plan_requested",
      eventDataJson: {
        prompt: parsed.data.prompt,
        repositoryId: repository.id,
      },
    });

    const result = await runPlanGraph({
      taskId: task.id,
      workspaceId: workspace.id,
      userId: authUser.id,
      repositoryId: repository.id,
      prompt: parsed.data.prompt,
      matches: [],
    });

    res.json({
      ok: true,
      taskId: task.id,
      approvalRequestId: result.approvalRequestId ?? "",
      repository: {
        id: repository.id,
        name: result.repositoryName ?? repository.name,
      },
      matches: result.matches ?? [],
      plan: result.plan,
    });
  } catch (error) {
    if (task) {
      await task.update({
        status: "failed",
        output: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      await TaskTrace.create({
        taskId: task.id,
        eventType: "plan_failed",
        eventDataJson: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    next(error);
  }
});

router.post("/approval-requests/:approvalRequestId", async (req, res, next) => {
  try {
    const authUser = requireAuthUser(req);
    const parsed = approvePlanSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: "Invalid approval payload",
        details: parsed.error.flatten(),
      });
      return;
    }

    const approval = await ApprovalRequest.findByPk(
      req.params.approvalRequestId,
    );

    if (!approval) {
      res.status(404).json({
        ok: false,
        error: "Approval request not found",
      });
      return;
    }

    const task = await Task.findByPk(approval.taskId);

    if (!task) {
      res.status(404).json({
        ok: false,
        error: "Task not found",
      });
      return;
    }

    const workspace = await Workspace.findOne({
      where: {
        id: task.workspaceId,
        ownerId: authUser.id,
      },
    });

    if (!workspace) {
      res.status(404).json({
        ok: false,
        error: "Approval request not found",
      });
      return;
    }

    await approval.update({
      status: parsed.data.status,
    });

    await TaskTrace.create({
      taskId: task.id,
      eventType: "approval_updated",
      eventDataJson: {
        approvalRequestId: approval.id,
        status: parsed.data.status,
      },
    });

    await task.update({
      status: parsed.data.status === "approved" ? "completed" : "failed",
    });

    res.json({
      ok: true,
      approval,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
