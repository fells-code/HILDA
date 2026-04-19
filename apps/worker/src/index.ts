import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  formatRepositoryOverviewSummary,
  generateRepositoryOverview,
} from "@hilda/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

import { getRepositorySourcePath, getRepositoryWorkingPath } from "./lib/repoPaths";
import { inspectLocalRepository, syncRepository } from "./lib/syncRepository";

async function processOneRepository(): Promise<boolean> {
  const db = await import("@hilda/db");
  const { Repository } = db;
  const {
    connectDatabase,
    initModels,
    findNextQueuedRepository,
    markRepositoryFailed,
    markRepositoryIndexed,
    markRepositorySyncing,
  } = db;

  initModels();
  await connectDatabase();

  const repository = await findNextQueuedRepository();

  if (!repository) {
    return false;
  }

  try {
    await markRepositorySyncing(repository.id);

    let repoPath: string;
    let commitSha: string | null;

    if (repository.provider === "local") {
      if (!repository.localPath) {
        throw new Error("Repository localPath is required for local indexing");
      }

      repoPath = getRepositorySourcePath(repository);
      commitSha = await inspectLocalRepository(repoPath);
    } else {
      if (!repository.cloneUrl) {
        throw new Error("Repository cloneUrl is required for GitHub indexing");
      }

      const workingPath = getRepositoryWorkingPath(repository.id);
      commitSha = await syncRepository(
        repository.cloneUrl,
        workingPath,
        repository.defaultBranch,
      );
      repoPath = getRepositorySourcePath(repository);
    }

    const overview = await generateRepositoryOverview(repoPath);
    const summary = formatRepositoryOverviewSummary(overview);

    await markRepositoryIndexed(repository.id, summary, commitSha);

    console.log(`Indexed repository ${repository.name}`);
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown indexing failure";

    await markRepositoryFailed(repository.id, message);
    console.error(`Failed indexing repository ${repository.name}`);
    console.error(error);
    return true;
  }
}

async function boot() {
  console.log("@hilda/worker started");

  setInterval(async () => {
    try {
      const didWork = await processOneRepository();

      if (!didWork) {
        console.log("No queued repositories");
      }
    } catch (error) {
      console.error("@hilda/worker poll failed");
      console.error(error);
    }
  }, 5000);
}

boot().catch((error) => {
  console.error("@hilda/worker failed to start");
  console.error(error);
  process.exit(1);
});
