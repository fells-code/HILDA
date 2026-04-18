export type RoutedIntent = "repo_analysis" | "question" | "plan";

export type RepoAnalysisIntent =
  | "count_tests"
  | "list_commands"
  | "summarize_structure";

export function routePrompt(prompt: string): {
  route: RoutedIntent;
  analysisIntent?: RepoAnalysisIntent;
} {
  const lower = prompt.toLowerCase();

  if (
    lower.includes("how many tests") ||
    lower.includes("count tests") ||
    lower.includes("test files")
  ) {
    return {
      route: "repo_analysis",
      analysisIntent: "count_tests",
    };
  }

  if (
    lower.includes("what commands can i run") ||
    lower.includes("available commands") ||
    lower.includes("scripts")
  ) {
    return {
      route: "repo_analysis",
      analysisIntent: "list_commands",
    };
  }

  if (
    lower.includes("repository overview") ||
    lower.includes("repo overview") ||
    lower.includes("overview of this repo") ||
    lower.includes("overview of this repository") ||
    lower.includes("what is this code base") ||
    lower.includes("what is this codebase") ||
    lower.includes("how is it architected") ||
    lower.includes("architecture") ||
    lower.includes("what does it do")
  ) {
    return {
      route: "repo_analysis",
      analysisIntent: "summarize_structure",
    };
  }

  if (
    lower.startsWith("add ") ||
    lower.startsWith("implement ") ||
    lower.startsWith("create ") ||
    lower.includes("help me add") ||
    lower.includes("plan ")
  ) {
    return {
      route: "plan",
    };
  }

  return {
    route: "question",
  };
}
