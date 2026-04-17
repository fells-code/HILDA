import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import { Repository, Task, TaskTrace, Workspace } from "@hilda/db";
import type { AuthenticatedRequest } from "../middleware/devAuth";
import { getProjectRoot } from "../lib/rootPaths";
import { summarizeMatches } from "../lib/summarizeMatches";

const router = Router();

const askQuestionSchema = z.object({
  repositoryId: z.string().uuid(),
  question: z.string().trim().min(1).max(500),
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

router.post("/questions", async (req, res, next) => {
  let task: Task | null = null;
  try {
    const authUser = (req as AuthenticatedRequest).authUser;
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

    const repoPath = getRepositoryWorkingPath(repository.id);
    await fs.access(repoPath).catch(() => {
      throw new Error(`Indexed repository path not found: ${repoPath}`);
    });

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
    const files: string[] = [];
    await walk(repoPath, repoPath, files);

    await TaskTrace.create({
      taskId: task.id,
      eventType: "files_scanned",
      eventDataJson: {
        fileCount: files.length,
      },
    });

    const terms = parsed.data.question
      .toLowerCase()
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 3);

    const matches: Array<{
      path: string;
      score: number;
      snippet: string;
    }> = [];

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
          snippet: buildSnippet(content, terms[0] || parsed.data.question),
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);

    const topMatches = matches.slice(0, 10);
    const answer = summarizeMatches(parsed.data.question, topMatches);

    await TaskTrace.create({
      taskId: task.id,
      eventType: "matches_ranked",
      eventDataJson: {
        matchCount: topMatches.length,
        topPaths: topMatches.slice(0, 5).map((match) => match.path),
      },
    });

    await task.update({
      status: "completed",
      output: {
        answer,
        matchCount: topMatches.length,
      },
    });

    res.json({
      ok: true,
      taskId: task.id,
      question: parsed.data.question,
      answer,
      repository: {
        id: repository.id,
        name: repository.name,
      },
      matches: topMatches,
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
