import { Router } from "express";
import {
  ApprovalRequest,
  PatchArtifact,
  Repository,
  Task,
  TaskTrace,
  Workspace,
} from "@hilda/db";
import { requireAuthUser } from "../middleware/devAuth";

const router = Router();

router.get("/tasks/:taskId", async (req, res, next) => {
  try {
    const authUser = requireAuthUser(req);
    const { taskId } = req.params;

    const task = await Task.findByPk(taskId);

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
        error: "Task not found",
      });
      return;
    }

    const traces = await TaskTrace.findAll({
      where: { taskId: task.id },
      order: [["createdAt", "ASC"]],
    });

    const approvals = await ApprovalRequest.findAll({
      where: { taskId: task.id },
      order: [["createdAt", "ASC"]],
    });

    const artifacts = await PatchArtifact.findAll({
      where: { taskId: task.id },
      order: [["createdAt", "ASC"]],
    });

    const repository = task.primaryRepositoryId
      ? await Repository.findByPk(task.primaryRepositoryId)
      : null;

    res.json({
      ok: true,
      task,
      repository,
      traces,
      approvals,
      artifacts,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
