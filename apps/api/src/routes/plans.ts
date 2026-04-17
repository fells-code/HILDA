import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import {
  ApprovalRequest,
  Repository,
  Task,
  TaskTrace,
  Workspace,
} from "@hilda/db";
import { buildPlan } from "../lib/buildPlan";
import { getProjectRoot } from "../lib/rootPaths";
import type { AuthenticatedRequest } from "../middleware/devAuth";

const router = Router();

const createPlanSchema = z.object({
  repositoryId: z.string().uuid(),
  prompt: z.string().trim().min(1).max(1000),
});

const approvePlanSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".next",
]);

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mdx",
  ".txt",
  ".sql",
  ".yml",
  ".yaml",
  ".sh",
]);

function getRepoStorageRoot(): string {
  const configured = process.env.REPO_STORAGE_ROOT || "./data/repos";

  if (path.isAbsolute(configured)) {
    return configured;
  }

  return path.resolve(getProjectRoot(), configured);
}

function getRepositoryWorkingPath(repositoryId: string): string {
  return path.resolve(getRepoStorageRoot(), repositoryId);
}

async function walk(
  dir: string,
  root: string,
  results: string[],
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(fullPath, root, results);
      continue;
    }

    const relativePath = path.relative(root, fullPath);
    const ext = path.extname(relativePath);

    if (TEXT_EXTENSIONS.has(ext)) {
      results.push(relativePath);
    }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSnippet(content: string, query: string): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) {
    return content.slice(0, 220).trim();
  }

  const start = Math.max(0, index - 100);
  const end = Math.min(content.length, index + query.length + 120);

  return content.slice(start, end).replace(/\s+/g, " ").trim();
}

async function findMatches(repositoryId: string, prompt: string) {
  const repoPath = getRepositoryWorkingPath(repositoryId);
  await fs.access(repoPath);

  const files: string[] = [];
  await walk(repoPath, repoPath, files);

  const terms = prompt
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);

  const matches: Array<{ path: string; score: number; snippet: string }> = [];

  for (const relativePath of files) {
    let score = 0;
    const lowerPath = relativePath.toLowerCase();

    for (const term of terms) {
      if (lowerPath.includes(term)) {
        score += 3;
      }
    }

    const absolutePath = path.join(repoPath, relativePath);
    const content = await fs.readFile(absolutePath, "utf8");
    const lowerContent = content.toLowerCase();

    for (const term of terms) {
      const regex = new RegExp(escapeRegExp(term), "g");
      const count = (lowerContent.match(regex) || []).length;
      score += count;
    }

    if (score > 0) {
      matches.push({
        path: relativePath,
        score,
        snippet: buildSnippet(content, terms[0] || prompt),
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 10);
}

router.post("/plans", async (req, res, next) => {
  let task: Task | null = null;

  try {
    const authUser = (req as AuthenticatedRequest).authUser;
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

    const matches = await findMatches(repository.id, parsed.data.prompt);

    await TaskTrace.create({
      taskId: task.id,
      eventType: "plan_matches_ranked",
      eventDataJson: {
        matchCount: matches.length,
        topPaths: matches.slice(0, 5).map((match) => match.path),
      },
    });

    const plan = buildPlan(parsed.data.prompt, matches);

    const approval = await ApprovalRequest.create({
      taskId: task.id,
      approvalType: "plan",
      summary: `Approve plan for: ${parsed.data.prompt}`,
      payloadJson: {
        plan,
      },
      status: "pending",
    });

    await TaskTrace.create({
      taskId: task.id,
      eventType: "approval_created",
      eventDataJson: {
        approvalRequestId: approval.id,
        approvalType: "plan",
      },
    });

    await task.update({
      status: "awaiting_approval",
      output: {
        plan,
        approvalRequestId: approval.id,
      },
    });

    res.json({
      ok: true,
      taskId: task.id,
      approvalRequestId: approval.id,
      repository: {
        id: repository.id,
        name: repository.name,
      },
      matches,
      plan,
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
    const authUser = (req as AuthenticatedRequest).authUser;
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
