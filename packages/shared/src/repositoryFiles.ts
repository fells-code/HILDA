import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".next",
]);

async function walkVisibleFiles(
  dir: string,
  root: string,
  results: string[],
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && DEFAULT_IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkVisibleFiles(fullPath, root, results);
      continue;
    }

    results.push(path.relative(root, fullPath).split(path.sep).join("/"));
  }
}

async function listFilesWithGit(repoPath: string): Promise<string[] | null> {
  try {
    await execFileAsync("git", ["-C", repoPath, "rev-parse", "--is-inside-work-tree"]);
    const { stdout } = await execFileAsync("git", [
      "-C",
      repoPath,
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
    ]);

    return stdout
      .split("\n")
      .map((file) => file.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

export async function listVisibleRepositoryFiles(
  repoPath: string,
): Promise<string[]> {
  const gitFiles = await listFilesWithGit(repoPath);

  if (gitFiles) {
    return gitFiles;
  }

  const files: string[] = [];
  await walkVisibleFiles(repoPath, repoPath, files);
  return files;
}

export function listVisibleTopLevelEntries(files: string[]): string[] {
  const entries = new Set<string>();

  for (const file of files) {
    const topLevelEntry = file.split("/")[0];

    if (topLevelEntry) {
      entries.add(topLevelEntry);
    }
  }

  return [...entries].slice(0, 25);
}
