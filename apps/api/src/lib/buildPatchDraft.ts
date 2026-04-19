import type { GeneratedPlan } from "./buildPlan";

export interface DraftEvidence {
  path: string;
  score: number;
  snippet: string;
}

export function buildPatchDraft(
  prompt: string,
  plan: GeneratedPlan,
  evidence: DraftEvidence[],
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
    "# Planned impacted files:",
    ...plan.impactedFiles.map((file) => `# - ${file}`),
    "",
    "# Proposed steps:",
    ...plan.steps.map((step, index) => `# ${index + 1}. ${step}`),
    "",
    "# Evidence:",
    ...evidence.slice(0, 5).map((match) => `# ${match.path} (score ${match.score})`),
  ].join("\n");

  return `${header}\n${planLines}\n`;
}
