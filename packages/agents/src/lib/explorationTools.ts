import fs from "node:fs/promises";
import path from "node:path";
import { listVisibleRepositoryFiles, listVisibleTopLevelEntries } from "@hilda/shared";
import type {
  DocsEvidence,
  EntrypointEvidence,
  ExecutionEvidence,
  FrameworkEvidence,
  RepoMetadataEvidence,
  RootPackageJsonEvidence,
  StructureEvidence,
  TestingEvidence,
  WorkspaceConfigEvidence,
} from "../state/explorationState";

interface PackageJsonLike {
  name?: string;
  description?: string;
  bin?: string | Record<string, string>;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
}

const FRAMEWORK_DETECTIONS = [
  { label: "React", packages: ["react"], configPatterns: [] },
  { label: "Next.js", packages: ["next"], configPatterns: ["next.config.js", "next.config.ts", "next.config.mjs"] },
  { label: "Vite", packages: ["vite"], configPatterns: ["vite.config.ts", "vite.config.js", "vite.config.mjs"] },
  { label: "Express", packages: ["express"], configPatterns: [] },
  { label: "Fastify", packages: ["fastify"], configPatterns: [] },
  { label: "NestJS", packages: ["@nestjs/core"], configPatterns: ["nest-cli.json"] },
  { label: "Sequelize", packages: ["sequelize"], configPatterns: [] },
  { label: "Prisma", packages: ["prisma", "@prisma/client"], configPatterns: ["prisma/schema.prisma"] },
  { label: "LangGraph", packages: ["@langchain/langgraph"], configPatterns: [] },
  { label: "OpenAI SDK", packages: ["openai"], configPatterns: [] },
  { label: "Vitest", packages: ["vitest"], configPatterns: ["vitest.config.ts", "vitest.config.js"] },
  { label: "Jest", packages: ["jest"], configPatterns: ["jest.config.ts", "jest.config.js", "jest.config.cjs"] },
  { label: "Playwright", packages: ["playwright", "@playwright/test"], configPatterns: ["playwright.config.ts", "playwright.config.js"] },
  { label: "CLI tooling", packages: ["commander", "yargs", "cac", "clipanion", "@oclif/core"], configPatterns: [] },
  { label: "Turbo", packages: ["turbo"], configPatterns: ["turbo.json"] },
];

const README_FILES = ["README.md", "README.mdx", "README.txt"];
const ENTRYPOINT_PATTERNS = [
  { suffix: "src/main.ts", reason: "conventional TypeScript entrypoint" },
  { suffix: "src/index.ts", reason: "conventional TypeScript entrypoint" },
  { suffix: "src/server.ts", reason: "backend server bootstrap" },
  { suffix: "src/app.ts", reason: "application bootstrap" },
  { suffix: "src/main.tsx", reason: "frontend bootstrap" },
  { suffix: "src/index.tsx", reason: "frontend bootstrap" },
  { suffix: "main.py", reason: "Python entrypoint" },
  { suffix: "app.py", reason: "Python application entrypoint" },
  { suffix: "manage.py", reason: "Django management entrypoint" },
  { suffix: "src/main.rs", reason: "Rust binary entrypoint" },
  { suffix: "main.rs", reason: "Rust binary entrypoint" },
  { suffix: "main.go", reason: "Go entrypoint" },
  { suffix: "index.js", reason: "JavaScript entrypoint" },
  { suffix: "server.js", reason: "JavaScript server bootstrap" },
];

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

function getNestedDirectoryNames(files: string[], prefix: string): string[] {
  const names = new Set<string>();

  for (const file of files) {
    if (!file.startsWith(`${prefix}/`)) {
      continue;
    }

    const child = file.slice(prefix.length + 1).split("/")[0];

    if (child) {
      names.add(child);
    }
  }

  return [...names].sort();
}

function normalizeBinEntries(
  packageName: string | undefined,
  bin: PackageJsonLike["bin"],
): Array<{ name: string; path: string }> {
  if (!bin) {
    return [];
  }

  if (typeof bin === "string") {
    return [
      {
        name: packageName ?? "cli",
        path: bin,
      },
    ];
  }

  return Object.entries(bin).map(([name, entryPath]) => ({
    name,
    path: entryPath,
  }));
}

function hasCliSignals(
  files: string[],
  rootPackageJson: RootPackageJsonEvidence | null,
  frameworks: string[],
): boolean {
  if ((rootPackageJson?.binEntries.length ?? 0) > 0) {
    return true;
  }

  if (frameworks.includes("CLI tooling")) {
    return true;
  }

  return files.some((file) => {
    const lower = file.toLowerCase();
    return (
      lower.startsWith("bin/") ||
      lower.endsWith("/bin/index.ts") ||
      lower.endsWith("/bin/index.js") ||
      lower.endsWith("/src/cli.ts") ||
      lower.endsWith("/src/cli.js") ||
      lower.endsWith("/src/commands/index.ts") ||
      lower.endsWith("/src/commands/index.js") ||
      lower.startsWith("src/cli.") ||
      lower.startsWith("src/commands/")
    );
  });
}

function inferRepositoryShape(
  topLevelEntries: string[],
  apps: string[],
  packages: string[],
  frameworks: string[],
  files: string[],
  rootPackageJson: RootPackageJsonEvidence | null,
): string {
  const lowerEntries = new Set(topLevelEntries.map((entry) => entry.toLowerCase()));

  if (apps.length > 0 && packages.length > 0) {
    return "Monorepo with separate apps and shared packages";
  }

  if (lowerEntries.has("apps") || lowerEntries.has("packages")) {
    return "Monorepo-style repository";
  }

  if (hasCliSignals(files, rootPackageJson, frameworks)) {
    return "CLI application";
  }

  if (frameworks.includes("Next.js")) {
    return "Web application";
  }

  if (frameworks.includes("React") && (frameworks.includes("Express") || frameworks.includes("Fastify"))) {
    return "Full-stack application";
  }

  if (frameworks.includes("Express") || frameworks.includes("Fastify") || frameworks.includes("NestJS")) {
    return "Backend service";
  }

  if (frameworks.includes("React") || frameworks.includes("Vite")) {
    return "Frontend application";
  }

  if (rootPackageJson?.manifestPath && files.includes("tsconfig.json")) {
    return "Node/TypeScript application";
  }

  return "General application repository";
}

function findPackageJsonPaths(files: string[]): string[] {
  return files
    .filter((file) => file === "package.json" || /^(apps|packages|services)\/[^/]+\/package\.json$/.test(file))
    .slice(0, 24);
}

export async function readRootPackageJson(
  repoPath: string,
  files?: string[],
): Promise<RootPackageJsonEvidence | null> {
  const repoFiles = files ?? (await listVisibleRepositoryFiles(repoPath));

  if (!repoFiles.includes("package.json")) {
    return null;
  }

  const packageJson = await readJsonFile<PackageJsonLike>(path.join(repoPath, "package.json"));

  if (!packageJson) {
    return null;
  }

  const workspacePatterns = Array.isArray(packageJson.workspaces)
    ? packageJson.workspaces
    : packageJson.workspaces?.packages ?? [];

  return {
    manifestPath: "package.json",
    packageName: packageJson.name ?? null,
    description: packageJson.description ?? null,
    binEntries: normalizeBinEntries(packageJson.name, packageJson.bin),
    scripts: Object.entries(packageJson.scripts ?? {}).map(([name, command]) => ({
      name,
      command,
    })),
    workspacePatterns,
  };
}

export function findWorkspaceConfig(
  files: string[],
  rootPackageJson: RootPackageJsonEvidence | null,
): WorkspaceConfigEvidence {
  const workspaceFiles = [
    "pnpm-workspace.yaml",
    "turbo.json",
    "package.json",
    "nx.json",
  ].filter((file) => files.includes(file));

  const monorepoTooling: string[] = [];

  if (files.includes("pnpm-workspace.yaml")) {
    monorepoTooling.push("pnpm workspace");
  }

  if (files.includes("turbo.json")) {
    monorepoTooling.push("Turbo");
  }

  if (files.includes("nx.json")) {
    monorepoTooling.push("Nx");
  }

  if (rootPackageJson?.workspacePatterns.length) {
    monorepoTooling.push("package.json workspaces");
  }

  return {
    packageManager: detectPackageManager(files),
    workspaceFiles,
    workspacePatterns: rootPackageJson?.workspacePatterns ?? [],
    monorepoTooling: [...new Set(monorepoTooling)],
  };
}

export function listTopLevelEntries(files: string[]): string[] {
  return listVisibleTopLevelEntries(files);
}

export function findReadmeAndDocs(files: string[]) {
  const readmePath =
    README_FILES.find((candidate) => files.includes(candidate)) ?? null;
  const docsFiles = files
    .filter(
      (file) =>
        file.startsWith("docs/") ||
        README_FILES.includes(file) ||
        file.toLowerCase().endsWith(".md") ||
        file.toLowerCase().endsWith(".mdx"),
    )
    .slice(0, 20);

  return {
    readmePath,
    docsFiles,
  };
}

export async function extractReadmeSummary(
  repoPath: string,
  readmePath: string | null,
): Promise<string | null> {
  if (!readmePath) {
    return null;
  }

  const content = await readUtf8(path.join(repoPath, readmePath));

  if (!content) {
    return null;
  }

  const paragraphs = content
    .split(/\n\s*\n/)
    .map((paragraph) => normalizeParagraph(paragraph))
    .filter((paragraph) => paragraph.length >= 40);

  return paragraphs[0]?.slice(0, 320) ?? null;
}

export async function gatherDocsEvidence(
  repoPath: string,
  files: string[],
): Promise<DocsEvidence> {
  const { readmePath, docsFiles } = findReadmeAndDocs(files);

  return {
    readmePath,
    readmeSummary: await extractReadmeSummary(repoPath, readmePath),
    docsFiles,
  };
}

export async function summarizeDirectoryStructure(
  files: string[],
  frameworks: string[],
  rootPackageJson: RootPackageJsonEvidence | null,
): Promise<StructureEvidence> {
  const topLevelEntries = listVisibleTopLevelEntries(files);
  const apps = getNestedDirectoryNames(files, "apps");
  const packages = getNestedDirectoryNames(files, "packages");
  const notableDirectories = topLevelEntries.filter((entry) =>
    ["apps", "packages", "services", "src", "docs", "scripts", "tests", "test", "infra"].includes(entry.toLowerCase()),
  );
  const configFiles = findConfigFiles(files);
  const dockerAndInfraFiles = findDockerAndInfraFiles(files);
  const ciWorkflows = findCiWorkflows(files);

  return {
    repositoryShape: inferRepositoryShape(
      topLevelEntries,
      apps,
      packages,
      frameworks,
      files,
      rootPackageJson,
    ),
    apps,
    packages,
    notableDirectories,
    configFiles,
    dockerAndInfraFiles,
    ciWorkflows,
  };
}

export async function listPackageScripts(
  repoPath: string,
  files: string[],
): Promise<ExecutionEvidence["commands"]> {
  const manifests = findPackageJsonPaths(files);
  const commandGroups: ExecutionEvidence["commands"] = [];

  for (const manifestPath of manifests) {
    const manifest = await readJsonFile<PackageJsonLike>(path.join(repoPath, manifestPath));

    if (!manifest?.scripts || Object.keys(manifest.scripts).length === 0) {
      continue;
    }

    commandGroups.push({
      manifestPath,
      packageName: manifest.name ?? null,
      scripts: Object.entries(manifest.scripts).map(([name, command]) => ({
        name,
        command,
      })),
    });
  }

  return commandGroups;
}

export function discoverTestFiles(files: string[]): TestingEvidence {
  const testFiles = files.filter((file) => {
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
      lower.endsWith(".spec.jsx") ||
      lower.endsWith("_test.go") ||
      lower.endsWith("_spec.rb") ||
      lower.endsWith("test.py")
    );
  });

  const coverageFiles = files.filter((file) => {
    const lower = file.toLowerCase();
    return (
      lower.includes("coverage") ||
      lower.endsWith("lcov.info") ||
      lower.endsWith("coverage-summary.json")
    );
  }).slice(0, 10);

  return {
    testCount: testFiles.length,
    sampleTestFiles: testFiles.slice(0, 20),
    coverageFiles,
  };
}

export async function detectFrameworks(
  repoPath: string,
  files: string[],
): Promise<FrameworkEvidence> {
  const manifests = findPackageJsonPaths(files);
  const packageNames = new Set<string>();

  for (const manifestPath of manifests) {
    const manifest = await readJsonFile<PackageJsonLike>(path.join(repoPath, manifestPath));
    for (const dependencyName of Object.keys(manifest?.dependencies ?? {})) {
      packageNames.add(dependencyName);
    }
    for (const dependencyName of Object.keys(manifest?.devDependencies ?? {})) {
      packageNames.add(dependencyName);
    }
  }

  const frameworks: string[] = [];
  const packageSignals: string[] = [];
  const configSignals: string[] = [];

  for (const detection of FRAMEWORK_DETECTIONS) {
    const matchedPackages = detection.packages.filter((packageName) =>
      packageNames.has(packageName),
    );
    const matchedConfigs = detection.configPatterns.filter((pattern) =>
      files.includes(pattern),
    );

    if (matchedPackages.length > 0 || matchedConfigs.length > 0) {
      frameworks.push(detection.label);
      if (matchedPackages.length > 0) {
        packageSignals.push(`${detection.label}: ${matchedPackages.join(", ")}`);
      }
      if (matchedConfigs.length > 0) {
        configSignals.push(`${detection.label}: ${matchedConfigs.join(", ")}`);
      }
    }
  }

  if (files.includes("Cargo.toml")) {
    frameworks.push("Cargo");
    configSignals.push("Cargo: Cargo.toml");
  }

  if (files.includes("pyproject.toml")) {
    frameworks.push("pyproject");
    configSignals.push("pyproject: pyproject.toml");
  }

  return {
    frameworks: [...new Set(frameworks)],
    aiTooling: frameworks.filter((framework) =>
      ["LangGraph", "OpenAI SDK"].includes(framework),
    ),
    packageSignals: packageSignals.slice(0, 12),
    configSignals: configSignals.slice(0, 12),
  };
}

export function findLikelyEntrypoints(
  files: string[],
  executionEvidence?: ExecutionEvidence,
  rootPackageJson?: RootPackageJsonEvidence | null,
): EntrypointEvidence {
  const entrypoints: Array<{ path: string; reason: string }> = [];

  for (const binEntry of rootPackageJson?.binEntries ?? []) {
    entrypoints.push({
      path: binEntry.path,
      reason: `package.json bin entry: ${binEntry.name}`,
    });
  }

  for (const pattern of ENTRYPOINT_PATTERNS) {
    const match = files.find((file) => file === pattern.suffix || file.endsWith(`/${pattern.suffix}`));
    if (match) {
      entrypoints.push({
        path: match,
        reason: pattern.reason,
      });
    }
  }

  for (const commandGroup of executionEvidence?.commands ?? []) {
    for (const script of commandGroup.scripts) {
      if (["dev", "start", "serve", "worker"].includes(script.name)) {
        entrypoints.push({
          path: `${commandGroup.manifestPath}#${script.name}`,
          reason: `package script: ${script.command}`,
        });
      }
    }
  }

  return {
    entrypoints: entrypoints
      .filter(
        (entry, index, all) =>
          all.findIndex((candidate) => candidate.path === entry.path) === index,
      )
      .slice(0, 12),
  };
}

export function findPackagesOrApps(files: string[]) {
  return {
    apps: getNestedDirectoryNames(files, "apps"),
    packages: getNestedDirectoryNames(files, "packages"),
  };
}

export function findConfigFiles(files: string[]): string[] {
  return files
    .filter((file) =>
      /(^|\/)(tsconfig\.json|vite\.config\.(ts|js|mjs)|next\.config\.(js|ts|mjs)|jest\.config\.(js|ts|cjs)|vitest\.config\.(js|ts)|eslint\.config\.(js|mjs)|\.eslintrc(\.(js|cjs|json))?|prettier\.config\.(js|cjs|mjs)|tailwind\.config\.(js|ts)|nest-cli\.json)$/.test(
        file,
      ),
    )
    .slice(0, 20);
}

export function findDockerAndInfraFiles(files: string[]): string[] {
  return files
    .filter((file) => {
      const base = path.basename(file).toLowerCase();
      return (
        base === "dockerfile" ||
        base === "docker-compose.yml" ||
        base === "docker-compose.yaml" ||
        base === "compose.yml" ||
        base === "compose.yaml" ||
        file === ".devcontainer/devcontainer.json" ||
        file.startsWith("infra/")
      );
    })
    .slice(0, 20);
}

export function findCiWorkflows(files: string[]): string[] {
  return files
    .filter((file) => file.startsWith(".github/workflows/"))
    .slice(0, 20);
}

export function detectPackageManager(files: string[]): string | null {
  if (files.includes("pnpm-lock.yaml") || files.includes("pnpm-workspace.yaml")) {
    return "pnpm";
  }

  if (files.includes("package-lock.json")) {
    return "npm";
  }

  if (files.includes("yarn.lock")) {
    return "yarn";
  }

  if (files.includes("Cargo.toml")) {
    return "cargo";
  }

  if (files.includes("pyproject.toml")) {
    return "pyproject";
  }

  return null;
}

export async function gatherRepoMetadata(
  repoPath: string,
): Promise<RepoMetadataEvidence & { repoFiles: string[] }> {
  const repoFiles = await listVisibleRepositoryFiles(repoPath);
  const rootPackageJson = await readRootPackageJson(repoPath, repoFiles);
  const workspaceConfig = findWorkspaceConfig(repoFiles, rootPackageJson);
  const topLevelEntries = listTopLevelEntries(repoFiles);

  return {
    repoFiles,
    topLevelEntries,
    visibleFileCount: repoFiles.length,
    manifestKind: repoFiles.includes("package.json")
      ? "package_json"
      : repoFiles.includes("Cargo.toml")
        ? "cargo_toml"
        : repoFiles.includes("pyproject.toml")
          ? "pyproject_toml"
          : "unknown",
    rootPackageJson,
    workspaceConfig,
  };
}
