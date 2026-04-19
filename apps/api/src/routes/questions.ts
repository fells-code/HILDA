import { Router } from "express";
import { z } from "zod";
import { Repository, Task, TaskTrace, Workspace } from "@hilda/db";
import { runQuestionGraph } from "@hilda/agents";
import { requireAuthUser } from "../middleware/devAuth";

const router = Router();

const askQuestionSchema = z.object({
  repositoryId: z.string().uuid(),
  question: z.string().trim().min(1).max(500),
});

router.post("/questions", async (req, res, next) => {
  let task: Task | null = null;

  try {
    const authUser = requireAuthUser(req);
    const parsed = askQuestionSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: "Invalid question payload",
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
      taskType: "question",
      status: "running",
      input: {
        question: parsed.data.question,
      },
    });

    await TaskTrace.create({
      taskId: task.id,
      eventType: "question_received",
      eventDataJson: {
        question: parsed.data.question,
        repositoryId: repository.id,
      },
    });

    const result = await runQuestionGraph({
      taskId: task.id,
      workspaceId: workspace.id,
      userId: authUser.id,
      repositoryId: repository.id,
      question: parsed.data.question,
      matches: [],
    });

    res.json({
      ok: true,
      taskId: task.id,
      question: parsed.data.question,
      answer: result.answer ?? "",
      repository: {
        id: repository.id,
        name: result.repositoryName ?? repository.name,
      },
      matches: result.matches ?? [],
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
        eventType: "question_failed",
        eventDataJson: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    next(error);
  }
});

export default router;
