import fs from "node:fs/promises";
import path from "node:path";
import {
  listVisibleRepositoryFiles,
  listVisibleTopLevelEntries,
} from "./repositoryFiles";

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".rb": "Ruby",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".kt": "Kotlin",
  ".swift": "Swift",
  ".php": "PHP",
  ".cs": "C#",
  ".cpp": "C++",
  ".c": "C",
  ".h": "C/C++",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sql": "SQL",
  ".sh": "Shell",
  ".md": "Markdown",
  ".mdx": "Markdown",
  ".json": "JSON",
  ".yml": "YAML",
  ".yaml": "YAML",
};

const FRAMEWORK_DETECTIONS = [
  { label: "React", packages: ["react"] },
  { label: "Next.js", packages: ["next"] },
  { label: "Vite", packages: ["vite"] },
  { label: "Express", packages: ["express"] },
  { label: "Fastify", packages: ["fastify"] },
  { label: "NestJS", packages: ["@nestjs/core"] },
  { label: "Sequelize", packages: ["sequelize"] },
  { label: "Prisma", packages: ["prisma", "@prisma/client"] },
  { label: "LangGraph", packages: ["@langchain/langgraph"] },
  { label: "OpenAI SDK", packages: ["openai"] },
  { label: "Vitest", packages: ["vitest"] },
  { label: "Jest", packages: ["jest"] },
  { label: "Playwright", packages: ["playwright", "@playwright/test"] },
  { label: "Turbo", packages: ["turbo"] },
  { label: "pnpm workspace", packages: ["pnpm"] },
];

const README_FILES = ["README.md", "README.mdx", "README.txt"];

export interface RepositoryOverviewMetric {
  label: string;
  value: string;
}

export interface RepositoryOverviewSection {
  title: string;
  items: string[];
}

export interface RepositoryOverviewEvidence {
  label: string;
  value: string;
}

export interface RepositoryOverview extends Record<string, unknown> {
  title: string;
  answer: string;
  metrics?: RepositoryOverviewMetric[];
  sections?: RepositoryOverviewSection[];
  evidence: RepositoryOverviewEvidence[];
}

interface PackageJsonLike {
  name?: string;
  description?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface CoverageSummary {
  linesPct?: number;
  statementsPct?: number;
  functionsPct?: number;
  branchesPct?: number;
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readUtf8(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function formatTopLanguages(
  languageCounts: Map<string, number>,
): RepositoryOverviewMetric[] {
  return [...languageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({
      label,
      value: `${count} file${count === 1 ? "" : "s"}`,
    }));
}

function countTestFiles(files: string[]): number {
  return files.filter((file) => {
    const lower = file.toLowerCase();
    return (
      lower.includes("/test/") ||
      lower.includes("/tests/") ||
      lower.endsWith(".test.ts") ||
      lower.endsWith(".test.tsx") ||
      lower.endsWith(".test.js") ||
      lower.endsWith(".test.jsx") ||
      lower.endsWith(".spec.ts") ||
      lower.endsWith(".spec.tsx") ||
      lower.endsWith(".spec.js") ||
      lower.endsWith(".spec.jsx")
    );
  }).length;
}

function detectFrameworks(packageJson: PackageJsonLike): string[] {
  const dependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };

  const packageNames = new Set(Object.keys(dependencies));
  const detected = FRAMEWORK_DETECTIONS.filter((entry) =>
    entry.packages.some((packageName) => packageNames.has(packageName)),
  ).map((entry) => entry.label);

  return detected.slice(0, 8);
}

function inferRepositoryShape(
  topLevelEntries: string[],
  frameworks: string[],
): string {
  const lowerEntries = new Set(topLevelEntries.map((entry) => entry.toLowerCase()));
  const hasApps = lowerEntries.has("apps");
  const hasPackages = lowerEntries.has("packages");
  const hasDocs = lowerEntries.has("docs");

  if (hasApps && hasPackages) {
    return "Monorepo with separate app and package boundaries";
  }

  if (frameworks.includes("Next.js")) {
    return "Web application";
  }

  if (frameworks.includes("React") && frameworks.includes("Express")) {
    return "Full-stack application";
  }

  if (frameworks.includes("Express") || frameworks.includes("Fastify")) {
    return "Backend service";
  }

  if (frameworks.includes("React") || frameworks.includes("Vite")) {
    return "Frontend application";
  }

  if (hasDocs && !hasApps && !hasPackages) {
    return "Documentation-heavy repository";
  }

  return "General application repository";
}

function normalizeParagraph(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractReadmeSummary(
  repoPath: string,
  files: string[],
): Promise<string | null> {
  for (const candidate of README_FILES) {
    if (!files.includes(candidate)) {
      continue;
    }

    const content = await readUtf8(path.join(repoPath, candidate));

    if (!content) {
      continue;
    }

    const paragraphs = content
      .split(/\n\s*\n/)
      .map((paragraph) => normalizeParagraph(paragraph))
      .filter((paragraph) => paragraph.length >= 40);

    if (paragraphs.length > 0) {
      return paragraphs[0].slice(0, 320);
    }
  }

  return null;
}

function inferPurpose(
  packageJson: PackageJsonLike | null,
  readmeSummary: string | null,
  repositoryShape: string,
  frameworks: string[],
): string {
  if (packageJson?.description?.trim()) {
    return packageJson.description.trim();
  }

  if (readmeSummary) {
    return readmeSummary;
  }

  if (frameworks.includes("React") && frameworks.includes("Express")) {
    return "This repository appears to support a full-stack product with a web frontend and backend API.";
  }

  if (frameworks.includes("Next.js")) {
    return "This repository appears to support a Next.js web application.";
  }

  if (frameworks.includes("Express") || frameworks.includes("Fastify")) {
    return "This repository appears to support an API or backend service.";
  }

  if (frameworks.includes("React") || frameworks.includes("Vite")) {
    return "This repository appears to support a frontend application.";
  }

  return `${repositoryShape}.`;
}

async function detectCoverageSummary(
  repoPath: string,
  files: string[],
): Promise<CoverageSummary | null> {
  const candidates = files.filter((file) =>
    [
      "coverage/coverage-summary.json",
      "coverage/summary.json",
      "coverage-summary.json",
    ].includes(file),
  );

  for (const candidate of candidates) {
    const summary = await readJsonFile<{
      total?: {
        lines?: { pct?: number };
        statements?: { pct?: number };
        functions?: { pct?: number };
        branches?: { pct?: number };
      };
    }>(path.join(repoPath, candidate));

    if (summary?.total) {
      return {
        linesPct: summary.total.lines?.pct,
        statementsPct: summary.total.statements?.pct,
        functionsPct: summary.total.functions?.pct,
        branchesPct: summary.total.branches?.pct,
      };
    }
  }

  return null;
}

function buildCoverageSummary(
  coverageSummary: CoverageSummary | null,
  files: string[],
  scripts: string[],
): string {
  if (coverageSummary?.linesPct != null) {
    const parts = [
      coverageSummary.linesPct != null
        ? `lines ${coverageSummary.linesPct}%`
        : null,
      coverageSummary.functionsPct != null
        ? `functions ${coverageSummary.functionsPct}%`
        : null,
      coverageSummary.branchesPct != null
        ? `branches ${coverageSummary.branchesPct}%`
        : null,
    ].filter(Boolean);

    return `Coverage report found: ${parts.join(", ")}.`;
  }

  const coverageSignals = [];

  if (files.some((file) => file.toLowerCase().includes("lcov.info"))) {
    coverageSignals.push("lcov output");
  }

  if (
    files.some((file) =>
      file.toLowerCase().includes("coverage") &&
      file.toLowerCase().endsWith(".json"),
    )
  ) {
    coverageSignals.push("coverage JSON artifacts");
  }

  if (scripts.some((name) => name.toLowerCase().includes("coverage"))) {
    coverageSignals.push("coverage script");
  }

  if (files.some((file) => file === ".github/workflows/ci.yml")) {
    coverageSignals.push("CI workflow");
  }

  if (coverageSignals.length > 0) {
    return `Coverage tooling signals found: ${coverageSignals.join(", ")}.`;
  }

  return "No concrete coverage report was found in the indexed files.";
}

function buildRisks(options: {
  readmeSummary: string | null;
  testFileCount: number;
  coverageSummary: CoverageSummary | null;
  scripts: string[];
  hasCi: boolean;
  frameworks: string[];
}): string[] {
  const risks: string[] = [];

  if (!options.readmeSummary) {
    risks.push("Project purpose is not clearly documented in a root README.");
  }

  if (options.testFileCount === 0) {
    risks.push("No likely automated test files were detected.");
  }

  if (!options.scripts.includes("lint")) {
    risks.push("No root lint script was detected, which makes safe automation harder.");
  }

  if (!options.scripts.includes("typecheck")) {
    risks.push("No root typecheck script was detected.");
  }

  if (!options.hasCi) {
    risks.push("No CI workflow was detected in .github/workflows.");
  }

  if (options.testFileCount > 0 && !options.coverageSummary) {
    risks.push("Tests exist, but no machine-readable coverage summary was found.");
  }

  if (options.frameworks.includes("OpenAI SDK") && options.testFileCount === 0) {
    risks.push("AI integration appears present, but no matching test safety net was detected.");
  }

  return risks.slice(0, 5);
}

function buildMilestones(options: {
  risks: string[];
  testFileCount: number;
  coverageSummary: CoverageSummary | null;
  hasCi: boolean;
  scripts: string[];
  frameworks: string[];
}): string[] {
  const milestones: string[] = [];

  if (options.testFileCount === 0) {
    milestones.push("Add a baseline automated test suite for the highest-risk flows.");
  }

  if (!options.coverageSummary) {
    milestones.push("Add coverage reporting so repository health can be tracked automatically.");
  }

  if (!options.hasCi) {
    milestones.push("Set up CI to run lint, typecheck, and tests on every change.");
  }

  if (!options.scripts.includes("lint") || !options.scripts.includes("typecheck")) {
    milestones.push("Standardize root validation scripts so the agent can run bounded checks safely.");
  }

  if (options.frameworks.includes("Turbo")) {
    milestones.push("Document app/package responsibilities so the monorepo is easier to navigate.");
  }

  if (milestones.length === 0 && options.risks.length > 0) {
    milestones.push("Turn the observed gaps into tracked engineering work with explicit ownership.");
  }

  if (milestones.length === 0) {
    milestones.push("Expand repository-specific diagnostics and validation workflows for agent use.");
  }

  return milestones.slice(0, 4);
}

function buildAnswer(options: {
  purpose: string;
  repositoryShape: string;
  topLanguages: RepositoryOverviewMetric[];
  frameworks: string[];
  testFileCount: number;
  coverageSummaryText: string;
  risks: string[];
}): string {
  const languageSummary =
    options.topLanguages.length > 0
      ? options.topLanguages
          .slice(0, 3)
          .map((entry) => entry.label)
          .join(", ")
      : "no dominant languages detected";

  const frameworkSummary =
    options.frameworks.length > 0
      ? options.frameworks.join(", ")
      : "no major frameworks detected from the root package.json";

  const riskSummary =
    options.risks.length > 0
      ? `The biggest gaps right now are ${options.risks
          .slice(0, 2)
          .map((risk) => risk.replace(/\.$/, "").toLowerCase())
          .join(" and ")}.`
      : "The repository shows the basic signals needed for guided agent workflows.";

  return [
    options.purpose,
    `${options.repositoryShape} built primarily with ${languageSummary}.`,
    `Key tooling signals include ${frameworkSummary}.`,
    `I found ${options.testFileCount} likely test file${
      options.testFileCount === 1 ? "" : "s"
    }. ${options.coverageSummaryText}`,
    riskSummary,
  ].join(" ");
}

export async function generateRepositoryOverview(
  repoPath: string,
): Promise<RepositoryOverview> {
  const files = await listVisibleRepositoryFiles(repoPath);
  const topLevelEntries = listVisibleTopLevelEntries(files);
  const languageCounts = new Map<string, number>();

  for (const file of files) {
    const language = LANGUAGE_BY_EXTENSION[path.extname(file).toLowerCase()];

    if (language) {
      languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1);
    }
  }

  const packageJson = files.includes("package.json")
    ? await readJsonFile<PackageJsonLike>(path.join(repoPath, "package.json"))
    : null;
  const scripts = Object.keys(packageJson?.scripts ?? {});
  const frameworks = detectFrameworks(packageJson ?? {});
  const readmeSummary = await extractReadmeSummary(repoPath, files);
  const repositoryShape = inferRepositoryShape(topLevelEntries, frameworks);
  const purpose = inferPurpose(
    packageJson,
    readmeSummary,
    repositoryShape,
    frameworks,
  );
  const testFileCount = countTestFiles(files);
  const markdownCount = files.filter((file) => file.endsWith(".md")).length;
  const coverageSummary = await detectCoverageSummary(repoPath, files);
  const coverageSummaryText = buildCoverageSummary(coverageSummary, files, scripts);
  const hasCi = files.some((file) => file.startsWith(".github/workflows/"));
  const topLanguages = formatTopLanguages(languageCounts);
  const risks = buildRisks({
    readmeSummary,
    testFileCount,
    coverageSummary,
    scripts,
    hasCi,
    frameworks,
  });
  const milestones = buildMilestones({
    risks,
    testFileCount,
    coverageSummary,
    hasCi,
    scripts,
    frameworks,
  });

  return {
    title: "Repository overview",
    answer: buildAnswer({
      purpose,
      repositoryShape,
      topLanguages,
      frameworks,
      testFileCount,
      coverageSummaryText,
      risks,
    }),
    metrics: [
      {
        label: "Files scanned",
        value: String(files.length),
      },
      {
        label: "Likely test files",
        value: String(testFileCount),
      },
      {
        label: "Markdown docs",
        value: String(markdownCount),
      },
      {
        label: "Root scripts",
        value: String(scripts.length),
      },
    ],
    sections: [
      {
        title: "Purpose",
        items: [purpose],
      },
      {
        title: "Architecture",
        items: [
          repositoryShape,
          `Top-level entries: ${topLevelEntries.join(", ") || "none"}`,
        ],
      },
      {
        title: "Languages",
        items:
          topLanguages.length > 0
            ? topLanguages.map((entry) => `${entry.label}: ${entry.value}`)
            : ["No dominant languages detected from file extensions."],
      },
      {
        title: "Frameworks and tooling",
        items: [
          frameworks.length > 0
            ? `Detected: ${frameworks.join(", ")}`
            : "No major frameworks detected from the root package.json.",
          scripts.length > 0
            ? `Root scripts: ${scripts.join(", ")}`
            : "No root package scripts found.",
        ],
      },
      {
        title: "Testing and coverage",
        items: [
          `Likely test files: ${testFileCount}`,
          coverageSummaryText,
        ],
      },
      {
        title: "Observed gaps and issues",
        items:
          risks.length > 0
            ? risks
            : ["No obvious workflow gaps were detected from the current repository signals."],
      },
      {
        title: "Suggested milestones",
        items: milestones,
      },
    ],
    evidence: [
      ...topLevelEntries.slice(0, 8).map((entry) => ({
        label: "top_level",
        value: entry,
      })),
      ...frameworks.slice(0, 5).map((framework) => ({
        label: "framework",
        value: framework,
      })),
      ...scripts.slice(0, 6).map((script) => ({
        label: "script",
        value: script,
      })),
    ],
  };
}

export function formatRepositoryOverviewSummary(
  overview: RepositoryOverview,
): string {
  const sections = overview.sections ?? [];
  const purpose = sections.find((section) => section.title === "Purpose");
  const languages = sections.find(
    (section) => section.title === "Languages",
  );
  const testing = sections.find(
    (section) => section.title === "Testing and coverage",
  );
  const risks = sections.find(
    (section) => section.title === "Observed gaps and issues",
  );
  const milestones = sections.find(
    (section) => section.title === "Suggested milestones",
  );

  return [
    overview.answer,
    purpose?.items[0] ? `Purpose: ${purpose.items[0]}` : null,
    languages?.items[0] ? `Languages: ${languages.items.slice(0, 3).join("; ")}` : null,
    testing?.items[0] ? `Testing: ${testing.items.join(" ")}` : null,
    risks?.items[0] ? `Issues: ${risks.items.slice(0, 2).join(" ")}` : null,
    milestones?.items[0]
      ? `Next milestones: ${milestones.items.slice(0, 2).join(" ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}
