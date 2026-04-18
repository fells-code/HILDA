import { TaskTrace } from "@hilda/db";
import { searchRepository } from "../../lib/questionSearch";
import type { PlanGraphState } from "../../state/planState";

export async function retrievePlanEvidenceNode(
  state: PlanGraphState,
): Promise<Partial<PlanGraphState>> {
  if (!state.repoPath) {
    throw new Error("Repository path is missing from graph state");
  }

  const result = await searchRepository(state.repoPath, state.prompt);

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_plan_evidence_retrieved",
    eventDataJson: {
      filesScanned: result.filesScanned,
      matchCount: result.matches.length,
      topMatches: result.matches.slice(0, 5).map((match) => ({
        path: match.path,
        lineStart: match.lineStart,
        score: match.score,
      })),
    },
  });

  return {
    filesScanned: result.filesScanned,
    matches: result.matches,
  };
}
