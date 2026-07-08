import { TaskTrace } from "@hilda/db";
import { gatherRepoMetadata } from "../../lib/explorationTools";
import type { ExplorationGraphState } from "../../state/explorationState";

export async function gatherRepoMetadataNode(
  state: ExplorationGraphState,
): Promise<Partial<ExplorationGraphState>> {
  if (!state.repoPath) {
    throw new Error("Repository path is missing from graph state");
  }

  const metadata = await gatherRepoMetadata(state.repoPath);

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_exploration_repo_metadata_gathered",
    eventDataJson: {
      visibleFileCount: metadata.visibleFileCount,
      topLanguages: metadata.topLanguages,
      topLevelEntries: metadata.topLevelEntries,
      manifestKind: metadata.manifestKind,
      packageManager: metadata.workspaceConfig.packageManager,
      workspaceFiles: metadata.workspaceConfig.workspaceFiles,
    },
  });

  return {
    repoFiles: metadata.repoFiles,
    repoMetadata: {
      topLevelEntries: metadata.topLevelEntries,
      visibleFileCount: metadata.visibleFileCount,
      topLanguages: metadata.topLanguages,
      manifestKind: metadata.manifestKind,
      rootPackageJson: metadata.rootPackageJson,
      workspaceConfig: metadata.workspaceConfig,
    },
  };
}
