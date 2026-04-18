import type { GeneratedPlan, PlanMatch } from "../state/planState";

export function buildPlan(prompt: string, matches: PlanMatch[]): GeneratedPlan {
  const impactedFiles = matches.slice(0, 5).map((match) => match.path);

  return {
    summary: `Plan for: ${prompt}`,
    assumptions: [
      "The indexed repository contains the primary implementation for this change.",
      "Top retrieved chunks are a reasonable starting point for planning.",
      "Human review is required before any implementation work begins.",
    ],
    impactedFiles,
    steps: [
      "Review the highest-confidence matching files and confirm the current flow.",
      "Identify the minimum set of files that must change.",
      "Update the main implementation path first, then supporting types or helpers.",
      "Check tests, docs, and configuration that may need to move with the change.",
      "Prepare a bounded patch only after the plan is approved.",
    ],
    risks: [
      "Retrieval may still miss indirect dependencies or shared types.",
      "Changes may span more files than the first evidence set suggests.",
      "Auth, config, or cross-package contracts may be affected.",
    ],
    validation: [
      "Search for related call sites and references.",
      "Run lint.",
      "Run typecheck.",
      "Run targeted tests for impacted modules.",
    ],
  };
}
