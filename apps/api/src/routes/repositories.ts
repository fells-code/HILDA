import fs from "node:fs/promises";
import { Router } from "express";
import {
  ApprovalRequest,
  PatchArtifact,
  Repository,
  RepositoryIndex,
  Task,
  TaskTrace,
  Workspace,
} from "@hilda/db";
import { createRepositorySchema } from "../schemas/repository";
import { requireAuthUser } from "../middleware/devAuth";
import {
  fetchGitHubOpenIssuesCount,
  parseGitHubRepositoryRef,
} from "../lib/githubRepository";
import { pickDirectory } from "../lib/pickDirectory";
import { getRepositoryWorkingPath } from "../lib/rootPaths";

const router = Router();

router.get("/workspaces/:workspaceId/repositories", async (req, res, next) => {
  try {
    const authUser = requireAuthUser(req);
    const { workspaceId } = req.params;

    const workspace = await Workspace.findOne({
      where: {
        id: workspaceId,
        ownerId: authUser.id,
      },
    });

    if (!workspace) {
      res.status(404).json({
        ok: false,
        error: "Workspace not found",
      });
      return;
    }

    const repositories = await Repository.findAll({
      where: { workspaceId },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      ok: true,
      repositories,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/repositories", async (req, res, next) => {
  try {
    const authUser = requireAuthUser(req);
    const parsed = createRepositorySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: "Invalid repository payload",
        details: parsed.error.flatten(),
      });
      return;
    }

    const workspace = await Workspace.findOne({
      where: {
        id: parsed.data.workspaceId,
        ownerId: authUser.id,
      },
    });

    if (!workspace) {
      res.status(404).json({
        ok: false,
        error: "Workspace not found",
      });
      return;
    }

    const repository = await Repository.create({
      workspaceId: parsed.data.workspaceId,
      provider: parsed.data.provider,
      name: parsed.data.name,
      defaultBranch: parsed.data.defaultBranch,
      cloneUrl: parsed.data.provider === "github" ? (parsed.data.cloneUrl ?? null) : null,
      localPath:
        parsed.data.provider === "local" ? (parsed.data.localPath ?? null) : null,
      externalId: parsed.data.externalId ?? null,
      status: "queued",
    });

    await RepositoryIndex.create({
      repositoryId: repository.id,
      commitSha: null,
      status: "queued",
      summary: null,
      indexedAt: null,
    });

    res.status(201).json({
      ok: true,
      repository,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/repositories/:repositoryId/metadata", async (req, res, next) => {
  try {
    const authUser = requireAuthUser(req);
    const repository = await Repository.findByPk(req.params.repositoryId);

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

    let githubIssuesOpen: number | null = null;

    if (repository.provider === "github" && repository.cloneUrl) {
      const repositoryRef = parseGitHubRepositoryRef(repository.cloneUrl);

      if (repositoryRef) {
        githubIssuesOpen = await fetchGitHubOpenIssuesCount(repositoryRef);
      }
    }

    res.json({
      ok: true,
      metadata: {
        sourceType: repository.provider,
        githubIssuesOpen,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/repositories/pick-local-directory", async (_req, res, next) => {
  try {
    const localPath = await pickDirectory();

    if (!localPath) {
      res.status(400).json({
        ok: false,
        error: "No directory selected",
      });
      return;
    }

    res.json({
      ok: true,
      localPath,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/repositories/:repositoryId", async (req, res, next) => {
  try {
    const authUser = requireAuthUser(req);
    const repository = await Repository.findByPk(req.params.repositoryId);

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

    const taskIds = (
      await Task.findAll({
        where: {
          primaryRepositoryId: repository.id,
        },
        attributes: ["id"],
      })
    ).map((task) => task.id);

    if (taskIds.length > 0) {
      await TaskTrace.destroy({
        where: {
          taskId: taskIds,
        },
      });

      await ApprovalRequest.destroy({
        where: {
          taskId: taskIds,
        },
      });

      await PatchArtifact.destroy({
        where: {
          taskId: taskIds,
        },
      });

      await Task.destroy({
        where: {
          id: taskIds,
        },
      });
    }

    await PatchArtifact.destroy({
      where: {
        repositoryId: repository.id,
      },
    });

    await RepositoryIndex.destroy({
      where: {
        repositoryId: repository.id,
      },
    });

    await repository.destroy();

    if (repository.provider !== "local") {
      await fs.rm(getRepositoryWorkingPath(repository.id), {
        recursive: true,
        force: true,
      });
    }

    res.json({
      ok: true,
      deletedRepositoryId: repository.id,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
