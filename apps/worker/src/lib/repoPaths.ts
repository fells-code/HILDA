import path from "node:path";
import type { Repository } from "@hilda/db";
import { getProjectRoot } from "./rootPaths";

export function getRepoStorageRoot(): string {
  const configured = process.env.REPO_STORAGE_ROOT || "./data/repos";

  if (path.isAbsolute(configured)) {
    return configured;
  }

  return path.resolve(getProjectRoot(), configured);
}

export function getRepositoryWorkingPath(repositoryId: string): string {
  return path.resolve(getRepoStorageRoot(), repositoryId);
}

export function getRepositorySourcePath(
  repository: Pick<Repository, "id" | "provider" | "localPath">,
): string {
  if (repository.provider === "local" && repository.localPath) {
    return repository.localPath;
  }

  return getRepositoryWorkingPath(repository.id);
}
