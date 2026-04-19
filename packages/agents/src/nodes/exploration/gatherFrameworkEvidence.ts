import { TaskTrace } from "@hilda/db";
import { detectFrameworks } from "../../lib/explorationTools";
import { shouldGatherFrameworkEvidence } from "../../lib/explorationIntent";
import type { ExplorationGraphState } from "../../state/explorationState";

export async function gatherFrameworkEvidenceNode(
  state: ExplorationGraphState,
): Promise<Partial<ExplorationGraphState>> {
  if (!state.intent || !shouldGatherFrameworkEvidence(state.intent)) {
    return {};
  }

  if (!state.repoPath || !state.repoFiles) {
    throw new Error("Repository context is missing from graph state");
  }

  const frameworkEvidence = await detectFrameworks(state.repoPath, state.repoFiles);

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_exploration_framework_evidence_gathered",
    eventDataJson: {
      frameworks: frameworkEvidence.frameworks,
      aiTooling: frameworkEvidence.aiTooling,
      packageSignals: frameworkEvidence.packageSignals.slice(0, 8),
    },
  });

  return {
    frameworkEvidence,
  };
}
