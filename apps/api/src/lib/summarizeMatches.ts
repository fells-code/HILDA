export interface SearchMatch {
  path: string;
  score: number;
  snippet: string;
}

export function summarizeMatches(
  question: string,
  matches: SearchMatch[],
): string {
  if (matches.length === 0) {
    return `I could not find direct lexical evidence for "${question}" in the indexed repository.`;
  }

  const top = matches.slice(0, 3).map((match) => match.path);

  return `I found the strongest lexical evidence for "${question}" in ${top.join(", ")}. Review the snippets below to confirm the exact implementation details.`;
}
