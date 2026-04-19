import { Router } from "express";
import { z } from "zod";
import {
  ApprovalRequest,
  Repository,
  Task,
  TaskTrace,
  Workspace,
} from "@hilda/db";
import { runPatchGraph } from "@hilda/agents";
import { requireAuthUser } from "../middleware/devAuth";

const router = Router();

const createPatchSchema = z.object({
  repositoryId: z.string().uuid(),
  approvedPlanTaskId: z.string().uuid(),
  prompt: z.string().trim().min(1).max(1000),
  evidence: z
    .array(
      z.object({
        path: z.string(),
        score: z.number(),
        snippet: z.string(),
      }),
    )
    .default([]),
});

const updatePatchApprovalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

router.post("/patches", async (req, res, next) => {
  let patchTask: Task | null = null;

  try {
    const authUser = requireAuthUser(req);
    const parsed = createPatchSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: "Invalid patch payload",
        details: parsed.error.flatten(),
      });
      return;
    }

    const repository = await Repository.findByPk(parsed.data.repositoryId);

    if (!repository) {
      res.status(404).json({ ok: false, error: "Repository not found" });
      return;
    }

    const workspace = await Workspace.findOne({
      where: {
        id: repository.workspaceId,
        ownerId: authUser.id,
      },
    });

    if (!workspace) {
      res.status(404).json({ ok: false, error: "Repository not found" });
      return;
    }

    patchTask = await Task.create({
      workspaceId: workspace.id,
      userId: authUser.id,
      primaryRepositoryId: repository.id,
      taskType: "patch",
      status: "running",
      input: {
        prompt: parsed.data.prompt,
        approvedPlanTaskId: parsed.data.approvedPlanTaskId,
      },
    });

    await TaskTrace.create({
      taskId: patchTask.id,
      eventType: "patch_requested",
      eventDataJson: {
        prompt: parsed.data.prompt,
        repositoryId: repository.id,
        approvedPlanTaskId: parsed.data.approvedPlanTaskId,
      },
    });

    const result = await runPatchGraph({
      taskId: patchTask.id,
      workspaceId: workspace.id,
      userId: authUser.id,
      repositoryId: repository.id,
      prompt: parsed.data.prompt,
      approvedPlanTaskId: parsed.data.approvedPlanTaskId,
      evidence: parsed.data.evidence,
      impactedFiles: [],
      steps: [],
    });

    res.json({
      ok: true,
      taskId: patchTask.id,
      approvalRequestId: result.approvalRequestId ?? "",
      patchArtifactId: result.patchArtifactId ?? "",
    });
  } catch (error) {
    if (patchTask) {
      await patchTask.update({
        status: "failed",
        output: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      await TaskTrace.create({
        taskId: patchTask.id,
        eventType: "patch_failed",
        eventDataJson: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    next(error);
  }
});

router.post(
  "/patch-approval-requests/:approvalRequestId",
  async (req, res, next) => {
    try {
      const authUser = requireAuthUser(req);
      const parsed = updatePatchApprovalSchema.safeParse(req.body);

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

      if (!approval || approval.approvalType !== "patch") {
        res.status(404).json({
          ok: false,
          error: "Patch approval request not found",
        });
        return;
      }

      const task = await Task.findByPk(approval.taskId);

      if (!task) {
        res.status(404).json({ ok: false, error: "Task not found" });
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
          error: "Patch approval request not found",
        });
        return;
      }

      await approval.update({
        status: parsed.data.status,
      });

      await TaskTrace.create({
        taskId: task.id,
        eventType: "patch_approval_updated",
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
  },
);

export default router;
