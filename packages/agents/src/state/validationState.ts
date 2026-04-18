export interface ValidationCommandResult {
  command: string;
  stdout: string;
  stderr: string;
  success: boolean;
}

export interface ValidationGraphState {
  taskId: string;
  workspaceId: string;
  userId: string;
  repositoryId: string;
  repositoryName?: string;
  patchTaskId: string;
  testCommand?: string | null;
  repoPath?: string;
  packageJsonPath?: string;
  commandsToRun: Array<{
    command: string;
    args: string[];
  }>;
  commandResults: ValidationCommandResult[];
  validationArtifactId?: string;
  success?: boolean;
  error?: string;
}
