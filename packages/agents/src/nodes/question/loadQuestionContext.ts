import fs from "node:fs/promises";
import { Repository, TaskTrace } from "@hilda/db";
import { getRepositoryWorkingPath } from "../../lib/rootPaths";
import type { QuestionGraphState } from "../../state/questionState";

export async function loadQuestionContextNode(
  state: QuestionGraphState,
): Promise<Partial<QuestionGraphState>> {
  const repository = await Repository.findByPk(state.repositoryId);

  if (!repository) {
    throw new Error("Repository not found");
  }

  const repoPath = getRepositoryWorkingPath(repository.id);
  await fs.access(repoPath).catch(() => {
    throw new Error(`Indexed repository path not found: ${repoPath}`);
  });

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_context_loaded",
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
