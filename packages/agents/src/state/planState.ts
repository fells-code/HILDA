export interface PlanMatch {
  path: string;
  score: number;
  snippet: string;
  lineStart: number;
  lineEnd: number;
  chunkId: string;
  reasons: string[];
}

export interface GeneratedPlan {
  summary: string;
  assumptions: string[];
  impactedFiles: string[];
  steps: string[];
  risks: string[];
  validation: string[];
}

export interface PlanGraphState {
  taskId: string;
  workspaceId: string;
  userId: string;
  repositoryId: string;
  repositoryName?: string;
  prompt: string;
  repoPath?: string;
  filesScanned?: number;
  matches: PlanMatch[];
  plan?: GeneratedPlan;
  approvalRequestId?: string;
  error?: string;
}
