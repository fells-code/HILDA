import { Router } from "express";
import { z } from "zod";
import { Repository, Task, TaskTrace, Workspace } from "@hilda/db";
import { runAnalysisGraph, runPlanGraph, runQuestionGraph } from "@hilda/agents";
import { routePrompt } from "../lib/intentRouter";
import type { AuthenticatedRequest } from "../middleware/devAuth";

const router = Router();

const askSchema = z.object({
  repositoryId: z.string().uuid(),
  prompt: z.string().trim().min(1).max(1000),
});

router.post("/ask", async (req, res, next) => {
  let task: Task | null = null;

  try {
    const authUser = (req as AuthenticatedRequest).authUser;
    const parsed = askSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: "Invalid ask payload",
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

    const routed = routePrompt(parsed.data.prompt);

    if (routed.route === "repo_analysis" && routed.analysisIntent) {
      task = await Task.create({
        workspaceId: workspace.id,
        userId: authUser.id,
        primaryRepositoryId: repository.id,
        taskType: "question",
        status: "running",
        input: {
          prompt: parsed.data.prompt,
          route: "repo_analysis",
          analysisIntent: routed.analysisIntent,
        },
      });

      await TaskTrace.create({
        taskId: task.id,
        eventType: "ask_routed",
        eventDataJson: {
          prompt: parsed.data.prompt,
          route: "repo_analysis",
          analysisIntent: routed.analysisIntent,
        },
      });

      const result = await runAnalysisGraph({
        taskId: task.id,
        workspaceId: workspace.id,
        userId: authUser.id,
        repositoryId: repository.id,
        prompt: parsed.data.prompt,
        intent: routed.analysisIntent,
      });

      res.json({
        ok: true,
        taskId: task.id,
        route: "repo_analysis",
        analysisIntent: routed.analysisIntent,
        repository: {
          id: repository.id,
          name: result.repositoryName ?? repository.name,
        },
        result: result.result,
      });
      return;
    }

    task = await Task.create({
      workspaceId: workspace.id,
      userId: authUser.id,
      primaryRepositoryId: repository.id,
      taskType: routed.route === "plan" ? "plan" : "question",
      status: "running",
      input: {
        prompt: parsed.data.prompt,
        route: routed.route,
        questionIntent: routed.questionIntent,
        planIntent: routed.planIntent,
      },
    });

    await TaskTrace.create({
      taskId: task.id,
      eventType: "ask_routed",
      eventDataJson: {
        prompt: parsed.data.prompt,
        route: routed.route,
        questionIntent: routed.questionIntent,
        planIntent: routed.planIntent,
      },
    });

    if (routed.route === "question") {
      const result = await runQuestionGraph({
        taskId: task.id,
        workspaceId: workspace.id,
        userId: authUser.id,
        repositoryId: repository.id,
        question: parsed.data.prompt,
        intent: routed.questionIntent ?? "general",
        matches: [],
      });

      res.json({
        ok: true,
        taskId: task.id,
        route: "question",
        repository: {
          id: repository.id,
          name: result.repositoryName ?? repository.name,
        },
        answer: result.answer ?? "",
        matches: result.matches ?? [],
      });
      return;
    }

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
      route: "plan",
      planIntent: routed.planIntent ?? "propose_change",
      repository: {
        id: repository.id,
        name: result.repositoryName ?? repository.name,
      },
      approvalRequestId: result.approvalRequestId ?? "",
      matches: result.matches ?? [],
      plan: result.plan,
      answer:
        routed.planIntent === "implementation_request"
          ? "I routed this into the implementation-planning workflow. HILDA still requires an explicit reviewed plan before making a change."
          : "I routed this into the planning workflow and generated a change plan with supporting evidence.",
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
        eventType: "ask_failed",
        eventDataJson: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    next(error);
  }
});

export default router;
