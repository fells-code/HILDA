import { Router } from "express";
import { Repository, RepositoryIndex, Workspace } from "@hilda/db";
import { createRepositorySchema } from "../schemas/repository";
import type { AuthenticatedRequest } from "../middleware/devAuth";

const router = Router();

router.get("/workspaces/:workspaceId/repositories", async (req, res, next) => {
  try {
    const authUser = (req as AuthenticatedRequest).authUser;
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
    const authUser = (req as AuthenticatedRequest).authUser;
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
      cloneUrl: parsed.data.cloneUrl ?? null,
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

export default router;
