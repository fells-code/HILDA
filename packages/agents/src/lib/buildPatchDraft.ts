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
  const lines = [
    `# Proposed patch for: ${prompt}`,
    "",
    "This fallback patch was generated without a code-editing model response.",
    "Review the plan below and replace this proposal file with real code edits.",
    "",
    "Plan summary:",
    plan.summary,
    "",
    "Planned impacted files:",
    ...plan.impactedFiles.map((file) => `- ${file}`),
    "",
    "Proposed implementation steps:",
    ...plan.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "Supporting evidence:",
    ...evidence
      .slice(0, 5)
      .map((match) => `- ${match.path} (score ${match.score})`),
    "",
  ];

  const content = lines.map((line) => `+${line}`).join("\n");

  return [
    "diff --git a/HILDA_PATCH_PROPOSAL.md b/HILDA_PATCH_PROPOSAL.md",
    "new file mode 100644",
    "--- /dev/null",
    "+++ b/HILDA_PATCH_PROPOSAL.md",
    "@@ -0,0 +1,18 @@",
    content,
    "",
  ].join("\n");
}
