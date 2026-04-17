import fs from "node:fs/promises";
import path from "node:path";
import simpleGit from "simple-git";

export async function syncRepository(
  cloneUrl: string,
  workingPath: string,
  defaultBranch: string,
): Promise<string | null> {
  await fs.mkdir(path.dirname(workingPath), { recursive: true });

  try {
    await fs.access(workingPath);
    const git = simpleGit(workingPath);
    await git.fetch();
    await git.checkout(defaultBranch);
    await git.pull("origin", defaultBranch);
    return (await git.revparse(["HEAD"])).trim();
  } catch {
    const git = simpleGit();
    await git.clone(cloneUrl, workingPath, [
      "--branch",
      defaultBranch,
      "--single-branch",
    ]);
    const repoGit = simpleGit(workingPath);
    return (await repoGit.revparse(["HEAD"])).trim();
  }
}
