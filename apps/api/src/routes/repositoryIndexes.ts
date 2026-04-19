import { Router } from "express";
import { Repository, RepositoryIndex, Workspace } from "@hilda/db";
import { requireAuthUser } from "../middleware/devAuth";

const router = Router();

router.get("/repositories/:repositoryId/index-status", async (req, res, next) => {
  try {
    const authUser = requireAuthUser(req);
    const { repositoryId } = req.params;

    const repository = await Repository.findByPk(repositoryId);

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

    const latestIndex = await RepositoryIndex.findOne({
      where: { repositoryId },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      ok: true,
      repository: {
        id: repository.id,
        name: repository.name,
        status: repository.status,
      },
      index: latestIndex,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
