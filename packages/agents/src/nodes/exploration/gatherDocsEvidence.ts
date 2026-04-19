import { TaskTrace } from "@hilda/db";
import { gatherDocsEvidence } from "../../lib/explorationTools";
import { shouldGatherDocsEvidence } from "../../lib/explorationIntent";
import type { ExplorationGraphState } from "../../state/explorationState";

export async function gatherDocsEvidenceNode(
  state: ExplorationGraphState,
): Promise<Partial<ExplorationGraphState>> {
  if (!state.intent || !shouldGatherDocsEvidence(state.intent)) {
    return {};
  }

  if (!state.repoPath || !state.repoFiles) {
    throw new Error("Repository context is missing from graph state");
  }

  const docsEvidence = await gatherDocsEvidence(state.repoPath, state.repoFiles);

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_exploration_docs_evidence_gathered",
    eventDataJson: {
      readmePath: docsEvidence.readmePath,
      docsFiles: docsEvidence.docsFiles.slice(0, 10),
      hasReadmeSummary: Boolean(docsEvidence.readmeSummary),
    },
  });

  return {
    docsEvidence,
  };
}
