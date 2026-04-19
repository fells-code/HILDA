import { TaskTrace } from "@hilda/db";
import { discoverTestFiles } from "../../lib/explorationTools";
import { shouldGatherTestingEvidence } from "../../lib/explorationIntent";
import type { ExplorationGraphState } from "../../state/explorationState";

export async function gatherTestingEvidenceNode(
  state: ExplorationGraphState,
): Promise<Partial<ExplorationGraphState>> {
  if (!state.intent || !shouldGatherTestingEvidence(state.intent)) {
    return {};
  }

  if (!state.repoFiles) {
    throw new Error("Repository files are missing from graph state");
  }

  const testingEvidence = discoverTestFiles(state.repoFiles);

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_exploration_testing_evidence_gathered",
    eventDataJson: {
      testCount: testingEvidence.testCount,
      sampleTestFiles: testingEvidence.sampleTestFiles.slice(0, 10),
      coverageFiles: testingEvidence.coverageFiles,
    },
  });

  return {
    testingEvidence,
  };
}
