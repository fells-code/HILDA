import type { RepositoryOverview } from "@hilda/shared";

export type ExplorationIntent =
  | "codebase_summary"
  | "purpose_summary"
  | "architecture_summary"
  | "commands_summary"
  | "test_count"
  | "framework_detection"
  | "entrypoints_summary";

export interface ExplorationEvidenceItem {
  label: string;
  value: string;
}

export interface RootPackageJsonEvidence {
  manifestPath: string | null;
  packageName: string | null;
  description: string | null;
  binEntries: Array<{ name: string; path: string }>;
  scripts: Array<{ name: string; command: string }>;
  workspacePatterns: string[];
}

export interface WorkspaceConfigEvidence {
  packageManager: string | null;
  workspaceFiles: string[];
  workspacePatterns: string[];
  monorepoTooling: string[];
}

export interface RepoMetadataEvidence {
  topLevelEntries: string[];
  visibleFileCount: number;
  manifestKind: "package_json" | "cargo_toml" | "pyproject_toml" | "unknown";
  rootPackageJson: RootPackageJsonEvidence | null;
  workspaceConfig: WorkspaceConfigEvidence;
}

export interface DocsEvidence {
  readmePath: string | null;
  readmeSummary: string | null;
  docsFiles: string[];
}

export interface StructureEvidence {
  repositoryShape: string;
  apps: string[];
  packages: string[];
  notableDirectories: string[];
  configFiles: string[];
  dockerAndInfraFiles: string[];
  ciWorkflows: string[];
}

export interface ExecutionEvidence {
  commands: Array<{
    manifestPath: string;
    packageName: string | null;
    scripts: Array<{ name: string; command: string }>;
  }>;
  packageManager: string | null;
  workspaceTooling: string[];
}

export interface TestingEvidence {
  testCount: number;
  sampleTestFiles: string[];
  coverageFiles: string[];
}

export interface FrameworkEvidence {
  frameworks: string[];
  aiTooling: string[];
  packageSignals: string[];
  configSignals: string[];
}

export interface EntrypointEvidence {
  entrypoints: Array<{
    path: string;
    reason: string;
  }>;
}

export interface ExplorationGraphState {
  taskId: string;
  workspaceId: string;
  userId: string;
  repositoryId: string;
  repositoryName?: string;
  prompt: string;
  intentHint?: ExplorationIntent;
  intent?: ExplorationIntent;
  repoPath?: string;
  repoFiles?: string[];
  repoMetadata?: RepoMetadataEvidence;
  docsEvidence?: DocsEvidence;
  structureEvidence?: StructureEvidence;
  executionEvidence?: ExecutionEvidence;
  testingEvidence?: TestingEvidence;
  frameworkEvidence?: FrameworkEvidence;
  entrypointEvidence?: EntrypointEvidence;
  answer?: string;
  evidence?: ExplorationEvidenceItem[];
  result?: RepositoryOverview;
  model?: string;
  error?: string;
}
