import { TaskTrace } from "@hilda/db";
import { searchRepository } from "../../lib/questionSearch";
import type { QuestionGraphState } from "../../state/questionState";

export async function retrieveEvidenceNode(
  state: QuestionGraphState,
): Promise<Partial<QuestionGraphState>> {
  if (!state.repoPath) {
    throw new Error("Repository path is missing from graph state");
  }

  const result = await searchRepository(state.repoPath, state.question);

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_evidence_retrieved",
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
