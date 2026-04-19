import type { ExplorationIntent } from "../state/explorationState";

export function classifyExplorationIntent(
  prompt: string,
  hint?: ExplorationIntent,
): ExplorationIntent {
  if (hint) {
    return hint;
  }

  const lower = prompt.toLowerCase();

  if (
    lower.includes("how many tests") ||
    lower.includes("count tests") ||
    lower.includes("test count") ||
    lower.includes("test files")
  ) {
    return "test_count";
  }

  if (
    lower.includes("what commands can i run") ||
    lower.includes("available commands") ||
    lower.includes("scripts") ||
    lower.includes("how do i run this")
  ) {
    return "commands_summary";
  }

  if (
    lower.includes("what framework") ||
    lower.includes("what frameworks") ||
    lower.includes("framework is this using") ||
    lower.includes("which framework")
  ) {
    return "framework_detection";
  }

  if (
    lower.includes("entrypoint") ||
    lower.includes("entry point") ||
    lower.includes("where does it start") ||
    lower.includes("where are the entrypoints")
  ) {
    return "entrypoints_summary";
  }

  if (
    lower.includes("how is it architected") ||
    lower.includes("architecture") ||
    lower.includes("how is it structured")
  ) {
    return "architecture_summary";
  }

  if (
    lower.includes("what does it do") ||
    lower.includes("purpose") ||
    lower.includes("what is it for")
  ) {
    return "purpose_summary";
  }

  return "codebase_summary";
}

export function shouldGatherDocsEvidence(intent: ExplorationIntent): boolean {
  return (
    intent === "codebase_summary" ||
    intent === "purpose_summary" ||
    intent === "architecture_summary"
  );
}

export function shouldGatherStructureEvidence(intent: ExplorationIntent): boolean {
  return (
    intent === "codebase_summary" ||
    intent === "purpose_summary" ||
    intent === "architecture_summary" ||
    intent === "entrypoints_summary"
  );
}

export function shouldGatherExecutionEvidence(intent: ExplorationIntent): boolean {
  return (
    intent === "codebase_summary" ||
    intent === "commands_summary" ||
    intent === "architecture_summary" ||
    intent === "entrypoints_summary"
  );
}

export function shouldGatherTestingEvidence(intent: ExplorationIntent): boolean {
  return intent === "test_count" || intent === "codebase_summary";
}

export function shouldGatherFrameworkEvidence(intent: ExplorationIntent): boolean {
  return (
    intent === "framework_detection" ||
    intent === "codebase_summary" ||
    intent === "purpose_summary" ||
    intent === "architecture_summary"
  );
}

export function shouldGatherEntrypointEvidence(intent: ExplorationIntent): boolean {
  return intent === "entrypoints_summary" || intent === "architecture_summary";
}
