import type { AnalysisResult, Repository, RepositoryMetadata } from "./api";

export function getOverviewSection(overview: AnalysisResult | null, title: string) {
  return overview?.sections?.find((section) => section.title === title) ?? null;
}

export function formatOverviewChatBody(result: AnalysisResult): string {
  const purpose = getOverviewSection(result, "Purpose")?.items[0];
  const architecture = (getOverviewSection(result, "Architecture")?.items ?? []).filter(
    (item) => !/:\s*none detected$/i.test(item),
  );
  const tooling = (
    getOverviewSection(result, "Frameworks and tooling")?.items ?? []
  ).filter((item) => !/^Detected:\s*$/i.test(item));
  const runtime = getOverviewSection(result, "Runtime and operations")?.items ?? [];
  const testing = getOverviewSection(result, "Testing and coverage")?.items ?? [];
  const issues = getOverviewSection(result, "Observed gaps and issues")?.items ?? [];
  const summary =
    result.answer
      .split(/(?<=[.?!])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)[0] ?? result.answer;

  const paragraphs = [
    `Summary: ${purpose ?? summary}`,
    architecture.length > 0
      ? `Architecture: ${architecture.slice(0, 2).join(" ")}`
      : null,
    tooling.length > 0 ? `Tooling: ${tooling.slice(0, 3).join(" ")}` : null,
    runtime.length > 0 ? `Runtime: ${runtime.slice(0, 3).join(" ")}` : null,
    testing.length > 0 ? `Testing: ${testing.slice(0, 2).join(" ")}` : null,
    issues.length > 0 ? `Risks: ${issues.slice(0, 2).join(" ")}` : null,
  ].filter(Boolean);

  if (paragraphs.length === 0) {
    return result.answer;
  }

  return paragraphs.join("\n\n");
}

export function getOverviewMetric(overview: AnalysisResult | null, label: string) {
  return overview?.metrics?.find((metric) => metric.label === label) ?? null;
}

function extractDetectedItems(line: string): string[] {
  const [, value] = line.split(":");
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function extractLanguageNames(overview: AnalysisResult | null): string[] {
  const section = getOverviewSection(overview, "Languages");

  if (!section) {
    return [];
  }

  return section.items
    .map((item) => item.split(":")[0]?.trim())
    .filter(Boolean)
    .slice(0, 4) as string[];
}

export function extractToolingNames(overview: AnalysisResult | null): string[] {
  const section = getOverviewSection(overview, "Frameworks and tooling");
  const detectedLine = section?.items.find((item) => item.startsWith("Detected:"));

  return detectedLine ? extractDetectedItems(detectedLine).slice(0, 4) : [];
}

export function extractRepositoryDescription(
  overview: AnalysisResult | null,
  isLoading: boolean,
): string {
  const purpose = getOverviewSection(overview, "Purpose")?.items[0];
  const answer = overview?.answer
    ?.split(/\n\s*\n|\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (purpose) {
    return purpose;
  }

  if (answer) {
    return answer;
  }

  if (isLoading) {
    return "Building a repository summary from package manifests, code structure, and repo signals...";
  }

  return "No repository summary yet. HILDA will fill this in as soon as indexing and overview generation are complete.";
}

export function formatIssueCount(
  repository: Repository,
  metadata: RepositoryMetadata | null,
  isLoading: boolean,
): string {
  if (repository.provider !== "github") {
    return "local";
  }

  if (isLoading) {
    return "loading";
  }

  return metadata?.githubIssuesOpen != null ? String(metadata.githubIssuesOpen) : "n/a";
}
