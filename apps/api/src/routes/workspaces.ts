import { Router } from "express";
import { Workspace, WorkspaceMember } from "@hilda/db";
import { createWorkspaceSchema } from "../schemas/workspace";
import type { AuthenticatedRequest } from "../middleware/devAuth";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const authUser = (req as AuthenticatedRequest).authUser;

    const workspaces = await Workspace.findAll({
      where: { ownerId: authUser.id },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      ok: true,
      workspaces,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const authUser = (req as AuthenticatedRequest).authUser;
    const parsed = createWorkspaceSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: "Invalid workspace payload",
        details: parsed.error.flatten(),
      });
      return;
    }

    const workspace = await Workspace.create({
      name: parsed.data.name,
      ownerId: authUser.id,
    });

    await WorkspaceMember.create({
      workspaceId: workspace.id,
      userId: authUser.id,
      role: "owner",
    });

    res.status(201).json({
      ok: true,
      workspace,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
