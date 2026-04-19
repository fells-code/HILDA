import { TaskTrace } from "@hilda/db";
import { findLikelyEntrypoints } from "../../lib/explorationTools";
import { shouldGatherEntrypointEvidence } from "../../lib/explorationIntent";
import type { ExplorationGraphState } from "../../state/explorationState";

export async function gatherEntrypointEvidenceNode(
  state: ExplorationGraphState,
): Promise<Partial<ExplorationGraphState>> {
  if (!state.intent || !shouldGatherEntrypointEvidence(state.intent)) {
    return {};
  }

  if (!state.repoFiles) {
    throw new Error("Repository files are missing from graph state");
  }

  const entrypointEvidence = findLikelyEntrypoints(
    state.repoFiles,
    state.executionEvidence,
    state.repoMetadata?.rootPackageJson ?? null,
  );

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_exploration_entrypoint_evidence_gathered",
    eventDataJson: {
      entrypoints: entrypointEvidence.entrypoints,
    },
  });

  return {
    entrypointEvidence,
  };
}
