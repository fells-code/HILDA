import { TaskTrace } from "@hilda/db";
import { summarizeDirectoryStructure } from "../../lib/explorationTools";
import { shouldGatherStructureEvidence } from "../../lib/explorationIntent";
import type { ExplorationGraphState } from "../../state/explorationState";

export async function gatherStructureEvidenceNode(
  state: ExplorationGraphState,
): Promise<Partial<ExplorationGraphState>> {
  if (!state.intent || !shouldGatherStructureEvidence(state.intent)) {
    return {};
  }

  if (!state.repoFiles) {
    throw new Error("Repository files are missing from graph state");
  }

  const structureEvidence = await summarizeDirectoryStructure(
    state.repoFiles,
    state.frameworkEvidence?.frameworks ?? [],
    state.repoMetadata?.rootPackageJson ?? null,
  );

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_exploration_structure_evidence_gathered",
    eventDataJson: {
      repositoryShape: structureEvidence.repositoryShape,
      apps: structureEvidence.apps,
      packages: structureEvidence.packages,
      notableDirectories: structureEvidence.notableDirectories,
    },
  });

  return {
    structureEvidence,
  };
}
