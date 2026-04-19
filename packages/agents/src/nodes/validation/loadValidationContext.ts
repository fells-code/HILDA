import fs from "node:fs/promises";
import path from "node:path";
import { Repository, TaskTrace } from "@hilda/db";
import { getRepositorySourcePath } from "../../lib/rootPaths";
import type { ValidationGraphState } from "../../state/validationState";

export async function loadValidationContextNode(
  state: ValidationGraphState,
): Promise<Partial<ValidationGraphState>> {
  const repository = await Repository.findByPk(state.repositoryId);

  if (!repository) {
    throw new Error("Repository not found");
  }

  const repoPath = getRepositorySourcePath(repository);

  await fs.access(repoPath).catch(() => {
    throw new Error(`Indexed repository path not found: ${repoPath}`);
  });

  const packageJsonPath = path.join(repoPath, "package.json");

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_validation_context_loaded",
    eventDataJson: {
      repositoryId: repository.id,
      repositoryName: repository.name,
      repoPath,
      packageJsonPath,
    },
  });

  return {
    repositoryName: repository.name,
    repoPath,
    packageJsonPath,
  };
}
