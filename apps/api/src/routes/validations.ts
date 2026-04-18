import { Router } from "express";
import { z } from "zod";
import { Repository, Task, TaskTrace, Workspace } from "@hilda/db";
import { runValidationGraph } from "@hilda/agents";
import type { AuthenticatedRequest } from "../middleware/devAuth";

const router = Router();

const createValidationSchema = z.object({
  repositoryId: z.string().uuid(),
  patchTaskId: z.string().uuid(),
  testCommand: z.string().trim().max(200).optional(),
});

router.post("/validations", async (req, res, next) => {
  let validationTask: Task | null = null;

  try {
    const authUser = (req as AuthenticatedRequest).authUser;
    const parsed = createValidationSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: "Invalid validation payload",
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

    const patchTask = await Task.findByPk(parsed.data.patchTaskId);

    if (!patchTask || patchTask.taskType !== "patch") {
      res.status(404).json({ ok: false, error: "Patch task not found" });
      return;
    }

    validationTask = await Task.create({
      workspaceId: workspace.id,
      userId: authUser.id,
      primaryRepositoryId: repository.id,
      taskType: "review",
      status: "running",
      input: {
        patchTaskId: patchTask.id,
        testCommand: parsed.data.testCommand ?? null,
      },
    });

    await TaskTrace.create({
      taskId: validationTask.id,
      eventType: "validation_requested",
      eventDataJson: {
        patchTaskId: patchTask.id,
        repositoryId: repository.id,
      },
    });

    const result = await runValidationGraph({
      taskId: validationTask.id,
      workspaceId: workspace.id,
      userId: authUser.id,
      repositoryId: repository.id,
      patchTaskId: patchTask.id,
      testCommand: parsed.data.testCommand ?? null,
      commandsToRun: [],
      commandResults: [],
    });

    res.json({
      ok: true,
      taskId: validationTask.id,
      artifactId: result.validationArtifactId ?? "",
      success: result.success ?? false,
    });
  } catch (error) {
    if (validationTask) {
      await validationTask.update({
        status: "failed",
        output: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      await TaskTrace.create({
        taskId: validationTask.id,
        eventType: "validation_failed",
        eventDataJson: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    next(error);
  }
});

export default router;
