import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getProjectRoot(): string {
  return path.resolve(__dirname, "../../../../");
}

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
