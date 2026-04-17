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
  provider: "github";
  name: string;
  defaultBranch: string;
  status: RepositoryStatus;
  createdAt: string;
}
