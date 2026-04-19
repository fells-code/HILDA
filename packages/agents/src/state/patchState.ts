export interface PatchEvidence {
  path: string;
  score: number;
  snippet: string;
}

export interface PatchDraftMetadata {
  mode: "llm" | "fallback";
  model?: string;
  candidateFiles: string[];
}

export interface PatchGraphState {
  taskId: string;
  workspaceId: string;
  userId: string;
  repositoryId: string;
  repositoryName?: string;
  prompt: string;
  approvedPlanTaskId: string;
  repoPath?: string;
  planSummary?: string;
  impactedFiles: string[];
  steps: string[];
  evidence: PatchEvidence[];
  patchDraft?: string;
  patchDraftMetadata?: PatchDraftMetadata;
  patchArtifactId?: string;
  approvalRequestId?: string;
  error?: string;
}
