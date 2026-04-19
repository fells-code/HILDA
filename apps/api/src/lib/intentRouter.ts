export type RoutedIntent = "repo_analysis" | "question" | "plan";

export type RepoAnalysisIntent =
  | "codebase_summary"
  | "purpose_summary"
  | "architecture_summary"
  | "commands_summary"
  | "test_count"
  | "framework_detection"
  | "entrypoints_summary";

export type QuestionIntent = "general" | "locate_implementation" | "debug_failure";

export type PlanIntent = "propose_change" | "implementation_request";

export function routePrompt(prompt: string): {
  route: RoutedIntent;
  analysisIntent?: RepoAnalysisIntent;
  questionIntent?: QuestionIntent;
  planIntent?: PlanIntent;
} {
  const lower = prompt.toLowerCase();

  if (
    lower.includes("how many tests") ||
    lower.includes("count tests") ||
    lower.includes("test files")
  ) {
    return {
      route: "repo_analysis",
      analysisIntent: "test_count",
    };
  }

  if (
    lower.includes("what commands can i run") ||
    lower.includes("available commands") ||
    lower.includes("scripts") ||
    lower.includes("how do i run this")
  ) {
    return {
      route: "repo_analysis",
      analysisIntent: "commands_summary",
    };
  }

  if (
    lower.includes("what framework") ||
    lower.includes("what frameworks") ||
    lower.includes("framework is this using") ||
    lower.includes("which framework")
  ) {
    return {
      route: "repo_analysis",
      analysisIntent: "framework_detection",
    };
  }

  if (
    lower.includes("where are the entrypoints") ||
    lower.includes("where are the entry points") ||
    lower.includes("entrypoint") ||
    lower.includes("entry point")
  ) {
    return {
      route: "repo_analysis",
      analysisIntent: "entrypoints_summary",
    };
  }

  if (
    lower.includes("repository overview") ||
    lower.includes("repo overview") ||
    lower.includes("overview of this repo") ||
    lower.includes("overview of this repository") ||
    lower.includes("what is this repo") ||
    lower.includes("what is this repository") ||
    lower.includes("what is this code base") ||
    lower.includes("what is this codebase") ||
    lower.includes("understand repo")
  ) {
    return {
      route: "repo_analysis",
      analysisIntent: "codebase_summary",
    };
  }

  if (
    lower.includes("how is it architected") ||
    lower.includes("architecture") ||
    lower.includes("how is it structured")
  ) {
    return {
      route: "repo_analysis",
      analysisIntent: "architecture_summary",
    };
  }

  if (lower.includes("what does it do")) {
    return {
      route: "repo_analysis",
      analysisIntent: "purpose_summary",
    };
  }

  if (
    lower.startsWith("where is ") ||
    lower.includes("where is the ") ||
    lower.includes("where is ") ||
    lower.includes("implemented") ||
    lower.includes("implementation of ") ||
    lower.includes("defined") ||
    lower.includes("wired up")
  ) {
    return {
      route: "question",
      questionIntent: "locate_implementation",
    };
  }

  if (
    lower.includes("why is this failing") ||
    lower.includes("why does this fail") ||
    lower.includes("why is it failing") ||
    lower.includes("why is this broken") ||
    lower.includes("debug") ||
    lower.includes("error") ||
    lower.includes("stack trace") ||
    lower.includes("failing test") ||
    lower.includes("not working")
  ) {
    return {
      route: "question",
      questionIntent: "debug_failure",
    };
  }

  if (
    lower.startsWith("make the change") ||
    lower.startsWith("implement this") ||
    lower.startsWith("fix this") ||
    lower.startsWith("build this") ||
    lower.includes("make the change") ||
    lower.includes("go ahead and implement") ||
    lower.includes("apply the change")
  ) {
    return {
      route: "plan",
      planIntent: "implementation_request",
    };
  }

  if (
    lower.startsWith("how would we add") ||
    lower.startsWith("how would i add") ||
    lower.startsWith("how should we add") ||
    lower.startsWith("how do we add") ||
    lower.startsWith("add ") ||
    lower.startsWith("implement ") ||
    lower.startsWith("create ") ||
    lower.includes("help me add") ||
    lower.includes("plan ")
  ) {
    return {
      route: "plan",
      planIntent: "propose_change",
    };
  }

  return {
    route: "question",
    questionIntent: "general",
  };
}
