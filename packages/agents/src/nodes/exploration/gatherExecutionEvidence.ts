import { TaskTrace } from "@hilda/db";
import { listPackageScripts } from "../../lib/explorationTools";
import { shouldGatherExecutionEvidence } from "../../lib/explorationIntent";
import type { ExplorationGraphState } from "../../state/explorationState";

export async function gatherExecutionEvidenceNode(
  state: ExplorationGraphState,
): Promise<Partial<ExplorationGraphState>> {
  if (!state.intent || !shouldGatherExecutionEvidence(state.intent)) {
    return {};
  }

  if (!state.repoPath || !state.repoFiles) {
    throw new Error("Repository context is missing from graph state");
  }

  const commands = await listPackageScripts(state.repoPath, state.repoFiles);
  const executionEvidence = {
    commands,
    packageManager: state.repoMetadata?.workspaceConfig.packageManager ?? null,
    workspaceTooling: state.repoMetadata?.workspaceConfig.monorepoTooling ?? [],
  };

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_exploration_execution_evidence_gathered",
    eventDataJson: {
      commandGroupCount: commands.length,
      commandCount: commands.reduce(
        (count, group) => count + group.scripts.length,
        0,
      ),
      packageManager: executionEvidence.packageManager,
    },
  });

  return {
    executionEvidence,
  };
}
