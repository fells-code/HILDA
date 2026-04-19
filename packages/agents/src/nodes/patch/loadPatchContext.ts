import fs from "node:fs/promises";
import { Repository, TaskTrace } from "@hilda/db";
import { getRepositorySourcePath } from "../../lib/rootPaths";
import type { PatchGraphState } from "../../state/patchState";

export async function loadPatchContextNode(
  state: PatchGraphState,
): Promise<Partial<PatchGraphState>> {
  const repository = await Repository.findByPk(state.repositoryId);

  if (!repository) {
    throw new Error("Repository not found");
  }

  const repoPath = getRepositorySourcePath(repository);

  await fs.access(repoPath).catch(() => {
    throw new Error(`Indexed repository path not found: ${repoPath}`);
  });

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_patch_context_loaded",
    eventDataJson: {
      repositoryId: repository.id,
      repositoryName: repository.name,
      repoPath,
    },
  });

  return {
    repositoryName: repository.name,
    repoPath,
  };
}
