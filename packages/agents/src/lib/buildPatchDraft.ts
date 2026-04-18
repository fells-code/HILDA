import type { PatchEvidence } from "../state/patchState";

export interface PatchPlanContext {
  summary: string;
  impactedFiles: string[];
  steps: string[];
}

export function buildPatchDraft(
  prompt: string,
  plan: PatchPlanContext,
  evidence: PatchEvidence[],
): string {
  const header = [
    "--- a/PLACEHOLDER",
    "+++ b/PLACEHOLDER",
    "@@",
    `# Draft patch for: ${prompt}`,
    "# This is a proposed artifact only. It has not been applied.",
    "",
  ].join("\n");

  const planLines = [
    "# Plan summary:",
    `# ${plan.summary}`,
    "",
    "# Planned impacted files:",
    ...plan.impactedFiles.map((file) => `# - ${file}`),
    "",
    "# Proposed implementation steps:",
    ...plan.steps.map((step, index) => `# ${index + 1}. ${step}`),
    "",
    "# Supporting evidence:",
    ...evidence
      .slice(0, 5)
      .map((match) => `# ${match.path} (score ${match.score})`),
  ].join("\n");

  return `${header}\n${planLines}\n`;
}
