import type { QuestionMatch } from "../state/questionState";

function formatCitation(match: QuestionMatch): string {
  return `${match.path}:${match.lineStart}`;
}

export function summarizeMatches(
  question: string,
  matches: QuestionMatch[],
): string {
  if (matches.length === 0) {
    return `I could not find strong grounded evidence for "${question}" in the indexed repository.`;
  }

  const topMatches = matches.slice(0, 3);
  const citations = topMatches.map((match) => `[${formatCitation(match)}]`);
  const paths = [...new Set(topMatches.map((match) => match.path))];

  return [
    `I found the strongest evidence for "${question}" in ${paths.join(", ")} ${citations.join(" ")}.`,
    "The results are ranked using both path/name signals and chunk-level content matches.",
    "Review the cited snippets below to confirm the exact implementation details.",
  ].join(" ");
}
