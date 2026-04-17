export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Repository {
  id: string;
  workspaceId: string;
  provider: "github";
  name: string;
  defaultBranch: string;
  cloneUrl: string | null;
  externalId: string | null;
  status: "pending" | "queued" | "syncing" | "indexed" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryIndex {
  id: string;
  repositoryId: string;
  commitSha: string | null;
  status: "pending" | "queued" | "syncing" | "indexed" | "failed";
  summary: string | null;
  indexedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionMatch {
  path: string;
  score: number;
  snippet: string;
}

export async function askQuestion(payload: {
  repositoryId: string;
  question: string;
}): Promise<{
  ok: true;
  question: string;
  repository: {
    id: string;
    name: string;
  };
  matches: QuestionMatch[];
}> {
  return request("/questions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

const API_BASE_URL = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function listWorkspaces(): Promise<{
  ok: true;
  workspaces: Workspace[];
}> {
  return request("/workspaces");
}

export async function createWorkspace(payload: {
  name: string;
}): Promise<{ ok: true; workspace: Workspace }> {
  return request("/workspaces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listRepositories(
  workspaceId: string,
): Promise<{ ok: true; repositories: Repository[] }> {
  return request(`/workspaces/${workspaceId}/repositories`);
}

export async function createRepository(payload: {
  workspaceId: string;
  provider: "github";
  name: string;
  defaultBranch: string;
  cloneUrl?: string | null;
  externalId?: string | null;
}): Promise<{ ok: true; repository: Repository }> {
  return request("/repositories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getRepositoryIndexStatus(repositoryId: string): Promise<{
  ok: true;
  repository: Pick<Repository, "id" | "name" | "status">;
  index: RepositoryIndex | null;
}> {
  return request(`/repositories/${repositoryId}/index-status`);
}
