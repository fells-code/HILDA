import type { RepositoryOverview } from "@hilda/shared";
import { explorationAnswerJsonSchema } from "./explorationAnswerSchema";
import { getExplorationModel, getOpenAIClient } from "./openai";
import type {
  DocsEvidence,
  EntrypointEvidence,
  ExecutionEvidence,
  ExplorationEvidenceItem,
  ExplorationIntent,
  FrameworkEvidence,
  RepoMetadataEvidence,
  StructureEvidence,
  TestingEvidence,
} from "../state/explorationState";

interface GenerateExplorationAnswerInput {
  prompt: string;
  intent: ExplorationIntent;
  repositoryName?: string;
  repoMetadata?: RepoMetadataEvidence;
  docsEvidence?: DocsEvidence;
  structureEvidence?: StructureEvidence;
  executionEvidence?: ExecutionEvidence;
  testingEvidence?: TestingEvidence;
  frameworkEvidence?: FrameworkEvidence;
  entrypointEvidence?: EntrypointEvidence;
}

export interface ExplorationAnswerResult {
  result: RepositoryOverview;
  answer: string;
  evidence: ExplorationEvidenceItem[];
  mode: "llm" | "fallback";
  model?: string;
}

function buildEvidenceList(input: GenerateExplorationAnswerInput): ExplorationEvidenceItem[] {
  const evidence: ExplorationEvidenceItem[] = [];

  for (const entry of input.repoMetadata?.topLevelEntries.slice(0, 8) ?? []) {
    evidence.push({ label: "top_level", value: entry });
  }

  for (const scriptGroup of input.executionEvidence?.commands.slice(0, 4) ?? []) {
    for (const script of scriptGroup.scripts.slice(0, 3)) {
      evidence.push({
        label: "command",
        value: `${scriptGroup.manifestPath}#${script.name} -> ${script.command}`,
      });
    }
  }

  for (const framework of input.frameworkEvidence?.frameworks.slice(0, 6) ?? []) {
    evidence.push({ label: "framework", value: framework });
  }

  for (const entrypoint of input.entrypointEvidence?.entrypoints.slice(0, 6) ?? []) {
    evidence.push({
      label: "entrypoint",
      value: `${entrypoint.path} (${entrypoint.reason})`,
    });
  }

  for (const testFile of input.testingEvidence?.sampleTestFiles.slice(0, 6) ?? []) {
    evidence.push({ label: "test_file", value: testFile });
  }

  if (input.docsEvidence?.readmePath) {
    evidence.push({ label: "readme", value: input.docsEvidence.readmePath });
  }

  for (const binEntry of input.repoMetadata?.rootPackageJson?.binEntries.slice(0, 4) ?? []) {
    evidence.push({
      label: "bin_entry",
      value: `${binEntry.name} -> ${binEntry.path}`,
    });
  }

  return evidence.slice(0, 24);
}

function buildFallbackTitle(intent: ExplorationIntent): string {
  switch (intent) {
    case "purpose_summary":
      return "Repository purpose";
    case "architecture_summary":
      return "Repository architecture";
    case "commands_summary":
      return "Repository commands";
    case "test_count":
      return "Repository tests";
    case "framework_detection":
      return "Repository framework detection";
    case "entrypoints_summary":
      return "Repository entrypoints";
    default:
      return "Repository overview";
  }
}

function summarizeDeveloperIdentity(input: GenerateExplorationAnswerInput): string {
  const packageName = input.repoMetadata?.rootPackageJson?.packageName;
  const description = input.repoMetadata?.rootPackageJson?.description;
  const repoShape = input.structureEvidence?.repositoryShape ?? "application repository";
  const packageManager = input.repoMetadata?.workspaceConfig.packageManager;
  const frameworks = input.frameworkEvidence?.frameworks ?? [];
  const aiTooling = input.frameworkEvidence?.aiTooling ?? [];
  const entrypoints = input.entrypointEvidence?.entrypoints ?? [];
  const hasCliBin = (input.repoMetadata?.rootPackageJson?.binEntries.length ?? 0) > 0;

  if (description) {
    return description;
  }

  if (repoShape === "CLI application") {
    const cliName =
      input.repoMetadata?.rootPackageJson?.binEntries[0]?.name ?? packageName ?? "This repository";
    const languageHint = packageManager
      ? `${packageManager}/${frameworks.includes("CLI tooling") || frameworks.includes("Vitest") ? "TypeScript" : "Node"}`
      : "Node/TypeScript";
    return `${cliName} appears to be a ${languageHint} CLI tool.`;
  }

  if (packageName) {
    return `${packageName} appears to be a ${repoShape.toLowerCase()}.`;
  }

  if (aiTooling.length > 0 && entrypoints.length > 0) {
    return `This repository appears to be an AI-enabled ${repoShape.toLowerCase()} with identifiable entrypoints.`;
  }

  return `${input.repositoryName ?? "This repository"} appears to be a ${repoShape.toLowerCase()}.`;
}

function buildArchitectureLines(input: GenerateExplorationAnswerInput): string[] {
  const lines: string[] = [];
  const repoShape = input.structureEvidence?.repositoryShape ?? "General application repository";

  lines.push(repoShape);

  if (input.structureEvidence?.apps.length) {
    lines.push(`Apps: ${input.structureEvidence.apps.join(", ")}`);
  }

  if (input.structureEvidence?.packages.length) {
    lines.push(`Packages: ${input.structureEvidence.packages.join(", ")}`);
  }

  if (
    !input.structureEvidence?.apps.length &&
    !input.structureEvidence?.packages.length &&
    input.structureEvidence?.notableDirectories.length
  ) {
    lines.push(
      `Notable directories: ${input.structureEvidence.notableDirectories.join(", ")}`,
    );
  }

  return lines;
}

function buildToolingSummary(input: GenerateExplorationAnswerInput): string {
  const frameworks = input.frameworkEvidence?.frameworks.filter(
    (framework) => !["Cargo", "pyproject"].includes(framework),
  ) ?? [];
  const runtimeTooling = input.executionEvidence?.workspaceTooling ?? [];
  const packageManager = input.repoMetadata?.workspaceConfig.packageManager;
  const tooling = [...new Set([
    ...frameworks,
    ...runtimeTooling,
    packageManager ? `${packageManager} workspace` : null,
  ].filter(Boolean) as string[])];

  if (tooling.length === 0) {
    if (input.repoMetadata?.manifestKind === "package_json") {
      return "This looks like a JavaScript/TypeScript repository, but no major framework was confidently detected.";
    }

    return "No major framework or workspace tooling was confidently detected.";
  }

  return `Key tooling signals include ${tooling.join(", ")}.`;
}

function buildFallbackAnswer(input: GenerateExplorationAnswerInput): RepositoryOverview {
  const repoShape = input.structureEvidence?.repositoryShape ?? "General application repository";
  const purpose =
    input.docsEvidence?.readmeSummary ??
    summarizeDeveloperIdentity(input);
  const frameworks =
    input.frameworkEvidence?.frameworks.filter(
      (framework) => !["Cargo", "pyproject"].includes(framework),
    ).length
      ? input.frameworkEvidence.frameworks
          .filter((framework) => !["Cargo", "pyproject"].includes(framework))
          .join(", ")
      : input.repoMetadata?.manifestKind === "package_json"
        ? "JavaScript/TypeScript runtime signals"
        : "no major frameworks were confidently detected";
  const serviceModel =
    input.structureEvidence?.apps.length || input.structureEvidence?.packages.length
      ? [
          input.structureEvidence.apps.length
            ? `${input.structureEvidence.apps.length} app${input.structureEvidence.apps.length === 1 ? "" : "s"}`
            : null,
          input.structureEvidence.packages.length
            ? `${input.structureEvidence.packages.length} package${input.structureEvidence.packages.length === 1 ? "" : "s"}`
            : null,
        ]
          .filter(Boolean)
          .join(" and ")
      : input.structureEvidence?.notableDirectories.length
        ? input.structureEvidence.notableDirectories.join(", ")
        : "no explicit app/package split";

  let answer = `${purpose} ${repoShape} with ${serviceModel}. ${buildToolingSummary(input)}`;

  switch (input.intent) {
    case "commands_summary":
      answer =
        input.executionEvidence?.commands.length
          ? `I found ${input.executionEvidence.commands.reduce((count, group) => count + group.scripts.length, 0)} runnable package scripts across ${input.executionEvidence.commands.length} manifest${input.executionEvidence.commands.length === 1 ? "" : "s"}.`
          : "I could not find runnable package scripts in the visible manifests for this repository.";
      break;
    case "test_count":
      answer = `I found ${input.testingEvidence?.testCount ?? 0} likely test files in the visible repository contents.`;
      break;
    case "framework_detection":
      answer = `The strongest framework signals point to ${frameworks}.`;
      break;
    case "entrypoints_summary":
      answer =
        input.entrypointEvidence?.entrypoints.length
          ? `The most likely entrypoints are ${input.entrypointEvidence.entrypoints
              .slice(0, 4)
              .map((entry) => `${entry.path} (${entry.reason})`)
              .join(", ")}.`
          : "I could not identify strong entrypoint candidates from visible bootstrap files and scripts.";
      break;
    case "architecture_summary":
      answer = `${repoShape} organized around ${serviceModel}. ${buildToolingSummary(input)}`;
      break;
    case "purpose_summary":
      answer = `${purpose} ${buildToolingSummary(input)}`;
      break;
    default:
      answer = `${purpose} ${repoShape} organized around ${serviceModel}. ${buildToolingSummary(input)}`;
      break;
  }

  const metrics = [
    {
      label: "Files scanned",
      value: String(input.repoMetadata?.visibleFileCount ?? 0),
    },
    {
      label: "Likely test files",
      value: String(input.testingEvidence?.testCount ?? 0),
    },
    {
      label: "Commands",
      value: String(
        input.executionEvidence?.commands.reduce(
          (count, group) => count + group.scripts.length,
          0,
        ) ?? 0,
      ),
    },
    {
      label: "Frameworks detected",
      value: String(input.frameworkEvidence?.frameworks.length ?? 0),
    },
  ];

  const sections = [
    {
      title: "What it is",
      items: [purpose],
    },
    {
      title: "Architecture",
      items: buildArchitectureLines(input),
    },
    {
      title: "Execution and commands",
      items:
        input.executionEvidence?.commands.length
          ? input.executionEvidence.commands
              .slice(0, 4)
              .flatMap((group) =>
                group.scripts
                  .slice(0, 4)
                  .map(
                    (script) =>
                      `${group.manifestPath}#${script.name}: ${script.command}`,
                  ),
              )
          : ["No package scripts were detected in visible manifests."],
    },
    {
      title: "Frameworks and tooling",
      items:
        input.frameworkEvidence?.frameworks.length
          ? [
              `Detected: ${input.frameworkEvidence.frameworks
                .filter((framework) => !["Cargo", "pyproject"].includes(framework))
                .join(", ") || input.frameworkEvidence.frameworks.join(", ")}`,
              ...(input.repoMetadata?.rootPackageJson?.binEntries.length
                ? [
                    `CLI entrypoints: ${input.repoMetadata.rootPackageJson.binEntries
                      .map((entry) => `${entry.name} -> ${entry.path}`)
                      .join(", ")}`,
                  ]
                : []),
              ...(input.frameworkEvidence.packageSignals.slice(0, 3) ?? []),
              ...(input.frameworkEvidence.configSignals.slice(0, 2) ?? []),
            ]
          : ["No major frameworks were confidently detected."],
    },
    {
      title: "Testing and entrypoints",
      items: [
        `Likely test files: ${input.testingEvidence?.testCount ?? 0}`,
        ...(input.entrypointEvidence?.entrypoints
          .slice(0, 4)
          .map((entry) => `${entry.path}: ${entry.reason}`) ?? []),
      ],
    },
  ];

  return {
    title: buildFallbackTitle(input.intent),
    answer,
    metrics,
    sections,
    evidence: buildEvidenceList(input),
  };
}

function formatJson<T>(value: T): string {
  return JSON.stringify(value, null, 2);
}

export async function generateExplorationAnswer(
  input: GenerateExplorationAnswerInput,
): Promise<ExplorationAnswerResult> {
  try {
    const client = getOpenAIClient();
    const model = getExplorationModel();

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "developer",
          content: [
            "You are HILDA, a repository understanding assistant for developers.",
            "You synthesize exploratory answers from structured repository evidence.",
            "Do not invent repository facts not present in the evidence.",
            "Answer the exact user question in concise, developer-oriented language.",
            "Prefer practical statements about repo purpose, architecture, commands, frameworks, tests, and entrypoints.",
            "When evidence is weak or missing, state uncertainty directly.",
            "Return a structured response matching the provided JSON schema.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Prompt:\n${input.prompt}`,
            `Intent:\n${input.intent}`,
            "",
            "Structured repository evidence:",
            `Repository metadata:\n${formatJson(input.repoMetadata ?? null)}`,
            `Docs evidence:\n${formatJson(input.docsEvidence ?? null)}`,
            `Structure evidence:\n${formatJson(input.structureEvidence ?? null)}`,
            `Execution evidence:\n${formatJson(input.executionEvidence ?? null)}`,
            `Testing evidence:\n${formatJson(input.testingEvidence ?? null)}`,
            `Framework evidence:\n${formatJson(input.frameworkEvidence ?? null)}`,
            `Entrypoint evidence:\n${formatJson(input.entrypointEvidence ?? null)}`,
            "",
            "Produce a grounded repository answer for a developer.",
          ].join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: explorationAnswerJsonSchema,
      },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Exploration model returned no content");
    }

    const parsed = JSON.parse(content) as RepositoryOverview;

    return {
      result: parsed,
      answer: parsed.answer,
      evidence: parsed.evidence ?? [],
      mode: "llm",
      model,
    };
  } catch {
    const result = buildFallbackAnswer(input);
    return {
      result,
      answer: result.answer,
      evidence: result.evidence,
      mode: "fallback",
    };
  }
}
