import type { QuestionIntent, QuestionMatch } from "../state/questionState";

function formatCitation(match: QuestionMatch): string {
  return `${match.path}:${match.lineStart}`;
}

export function summarizeMatches(
  question: string,
  matches: QuestionMatch[],
  intent: QuestionIntent = "general",
): string {
  if (matches.length === 0) {
    if (intent === "debug_failure") {
      return `I could not find strong grounded evidence for "${question}" in the indexed repository. Try including the failing command, error text, or the module you expect is involved.`;
    }

    return `I could not find strong grounded evidence for "${question}" in the indexed repository.`;
  }

  const topMatches = matches.slice(0, 3);
  const citations = topMatches.map((match) => `[${formatCitation(match)}]`);
  const paths = [...new Set(topMatches.map((match) => match.path))];

  if (intent === "locate_implementation") {
    return [
      `The most likely implementation points for "${question}" are in ${paths.join(", ")} ${citations.join(" ")}.`,
      "I ranked these results using path, filename, and chunk-level content matches to surface the code most likely to own the behavior.",
      "Start with the highest-ranked snippet and then follow references outward from there.",
    ].join(" ");
  }

  if (intent === "debug_failure") {
    return [
      `The strongest debugging clues for "${question}" appear in ${paths.join(", ")} ${citations.join(" ")}.`,
      "These snippets are likely relevant because they matched both the failure wording and the surrounding implementation context.",
      "Use them to inspect the failing path, related configuration, and any nearby validation or test logic.",
    ].join(" ");
  }

  return [
    `I found the strongest evidence for "${question}" in ${paths.join(", ")} ${citations.join(" ")}.`,
    "The results are ranked using both path/name signals and chunk-level content matches.",
    "Review the cited snippets below to confirm the exact implementation details.",
  ].join(" ");
}
