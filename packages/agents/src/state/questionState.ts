export type QuestionIntent = "general" | "locate_implementation" | "debug_failure";

export interface QuestionMatch {
  path: string;
  score: number;
  snippet: string;
  lineStart: number;
  lineEnd: number;
  chunkId: string;
  reasons: string[];
}

export interface QuestionGraphState {
  taskId: string;
  workspaceId: string;
  userId: string;
  repositoryId: string;
  repositoryName?: string;
  question: string;
  intent?: QuestionIntent;
  repoPath?: string;
  filesScanned?: number;
  matches: QuestionMatch[];
  answer?: string;
  error?: string;
}
