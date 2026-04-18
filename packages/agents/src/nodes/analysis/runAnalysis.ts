import { TaskTrace } from "@hilda/db";
import { generateRepositoryOverview } from "@hilda/shared";
import {
  countTestFiles,
  listPackageScripts,
} from "../../lib/repoAnalysis";
import type { AnalysisGraphState } from "../../state/analysisState";

export async function runAnalysisNode(
  state: AnalysisGraphState,
): Promise<Partial<AnalysisGraphState>> {
  if (!state.repoPath) {
    throw new Error("Repository path is missing from graph state");
  }

  if (state.intent === "count_tests") {
    const result = await countTestFiles(state.repoPath);

    await TaskTrace.create({
      taskId: state.taskId,
      eventType: "graph_analysis_count_tests_completed",
      eventDataJson: {
        count: result.count,
        sample: result.sample.slice(0, 10),
      },
    });

    return {
      result: {
        title: "Test file count",
        answer: `I found ${result.count} likely test files in this repository.`,
        evidence: result.sample.map((file) => ({
          label: "test_file",
          value: file,
        })),
      },
    };
  }

  if (state.intent === "list_commands") {
    const scripts = await listPackageScripts(state.repoPath);
    const entries = Object.entries(scripts);

    await TaskTrace.create({
      taskId: state.taskId,
      eventType: "graph_analysis_list_commands_completed",
      eventDataJson: {
        commandCount: entries.length,
        commands: entries.map(([name]) => name),
      },
    });

    return {
      result: {
        title: "Available package scripts",
        answer:
          entries.length === 0
            ? "I could not find any package scripts in the root package.json."
            : `I found ${entries.length} root package scripts in package.json.`,
        evidence: entries.map(([name, command]) => ({
          label: name,
          value: command,
        })),
      },
    };
  }

  const overview = await generateRepositoryOverview(state.repoPath);

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_analysis_structure_completed",
    eventDataJson: {
      metrics: overview.metrics,
      sectionTitles: (overview.sections ?? []).map((section) => section.title),
      evidenceCount: overview.evidence.length,
    },
  });

  return {
    result: overview,
  };
}
