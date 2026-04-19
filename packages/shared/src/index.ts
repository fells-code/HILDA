export type Id = string;

export type UserRole = "user" | "admin";

export type RepositoryStatus =
  | "pending"
  | "queued"
  | "syncing"
  | "indexed"
  | "failed";

export type TaskStatus =
  | "queued"
  | "running"
  | "awaiting_approval"
  | "completed"
  | "failed";

export type RepositoryOverviewMetric = import("./repositoryOverview").RepositoryOverviewMetric;
export type RepositoryOverviewSection = import("./repositoryOverview").RepositoryOverviewSection;
export type RepositoryOverviewEvidence = import("./repositoryOverview").RepositoryOverviewEvidence;
export type RepositoryOverview = import("./repositoryOverview").RepositoryOverview;

export interface HealthResponse {
  ok: true;
  service: string;
  timestamp: string;
}

export interface Workspace {
  id: Id;
  name: string;
  ownerId: Id;
  createdAt: string;
}

export interface Repository {
  id: Id;
  workspaceId: Id;
  provider: "github" | "local";
  name: string;
  cloneUrl?: string | null;
  localPath?: string | null;
  defaultBranch: string;
  status: RepositoryStatus;
  createdAt: string;
}

export {
  formatRepositoryOverviewSummary,
  generateRepositoryOverview,
} from "./repositoryOverview";

export {
  listVisibleRepositoryFiles,
  listVisibleTopLevelEntries,
} from "./repositoryFiles";
