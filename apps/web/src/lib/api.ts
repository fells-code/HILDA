const API_BASE_URL = "/api";

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
  lineStart: number;
  lineEnd: number;
  chunkId: string;
  reasons: string[];
}

export interface TaskTrace {
  id: string;
  taskId: string;
  eventType: string;
  eventDataJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedPlan {
  summary: string;
  assumptions: string[];
  impactedFiles: string[];
  steps: string[];
  risks: string[];
  validation: string[];
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  approvalType: "plan" | "patch" | "validation";
  summary: string;
  payloadJson: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface PatchArtifact {
  id: string;
  taskId: string;
  repositoryId: string;
  artifactType: "patch" | "validation_report";
  title: string;
  content: string;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export async function createPatch(payload: {
  repositoryId: string;
  approvedPlanTaskId: string;
  prompt: string;
  evidence: QuestionMatch[];
}): Promise<{
  ok: true;
  taskId: string;
  approvalRequestId: string;
  artifact: PatchArtifact;
}> {
  return request("/patches", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePatchApprovalRequest(
  approvalRequestId: string,
  payload: { status: "approved" | "rejected" },
): Promise<{
  ok: true;
  approval: ApprovalRequest;
}> {
  return request(`/patch-approval-requests/${approvalRequestId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createValidation(payload: {
  repositoryId: string;
  patchTaskId: string;
  testCommand?: string;
}): Promise<{
  ok: true;
  taskId: string;
  artifact: PatchArtifact;
}> {
  return request("/validations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createPlan(payload: {
  repositoryId: string;
  prompt: string;
}): Promise<{
  ok: true;
  taskId: string;
  approvalRequestId: string;
  repository: {
    id: string;
    name: string;
  };
  matches: QuestionMatch[];
  plan: GeneratedPlan;
}> {
  return request("/plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateApprovalRequest(
  approvalRequestId: string,
  payload: { status: "approved" | "rejected" },
): Promise<{
  ok: true;
  approval: ApprovalRequest;
}> {
  return request(`/approval-requests/${approvalRequestId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTask(taskId: string): Promise<{
  ok: true;
  task: {
    id: string;
    status: string;
    input: Record<string, unknown>;
    output: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
  };
  repository: Repository | null;
  traces: TaskTrace[];
  approvals: ApprovalRequest[];
  artifacts: PatchArtifact[];
}> {
  return request(`/tasks/${taskId}`);
}

export async function askQuestion(payload: {
  repositoryId: string;
  question: string;
}): Promise<{
  ok: true;
  taskId: string;
  question: string;
  answer: string;
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

export interface AnalysisResult {
  title: string;
  answer: string;
  metrics?: Array<{
    label: string;
    value: string;
  }>;
  sections?: Array<{
    title: string;
    items: string[];
  }>;
  evidence: Array<{
    label: string;
    value: string;
  }>;
}

export async function askRepository(payload: {
  repositoryId: string;
  prompt: string;
}): Promise<
  | {
      ok: true;
      taskId: string;
      route: "repo_analysis";
      analysisIntent: string;
      repository: {
        id: string;
        name: string;
      };
      result: AnalysisResult;
    }
  | {
      ok: true;
      taskId: string;
      route: "question";
      repository: {
        id: string;
        name: string;
      };
      answer: string;
      matches: QuestionMatch[];
    }
> {
  return request("/ask", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
