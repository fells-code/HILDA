import type { RepositoryOverview } from "@hilda/shared";

export type AnalysisIntent = "count_tests" | "list_commands" | "summarize_structure";

export interface AnalysisGraphState {
  taskId: string;
  workspaceId: string;
  userId: string;
  repositoryId: string;
  repositoryName?: string;
  prompt: string;
  intent: AnalysisIntent;
  repoPath?: string;
  result?: RepositoryOverview;
  error?: string;
}
