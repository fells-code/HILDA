import { END, START, StateGraph } from "@langchain/langgraph";
import { createValidationArtifactNode } from "../nodes/validation/createValidationArtifact";
import { loadPatchTaskContextNode } from "../nodes/validation/loadPatchTaskContext";
import { loadValidationContextNode } from "../nodes/validation/loadValidationContext";
import { persistValidationResultNode } from "../nodes/validation/persistValidationResult";
import { planValidationCommandsNode } from "../nodes/validation/planValidationCommands";
import { runValidationCommandsNode } from "../nodes/validation/runValidationCommands";
import type { ValidationGraphState } from "../state/validationState";

export function createValidationGraph() {
  return new StateGraph<ValidationGraphState>({
    channels: {
      taskId: null,
      workspaceId: null,
      userId: null,
      repositoryId: null,
      repositoryName: null,
      patchTaskId: null,
      testCommand: null,
      repoPath: null,
      packageJsonPath: null,
      commandsToRun: {
        value: (current, update) => update ?? current ?? [],
        default: () => [],
      },
      commandResults: {
        value: (current, update) => update ?? current ?? [],
        default: () => [],
      },
      validationArtifactId: null,
      success: null,
      error: null,
    },
  })
    .addNode("load_context", loadValidationContextNode)
    .addNode("load_patch_task", loadPatchTaskContextNode)
    .addNode("plan_commands", planValidationCommandsNode)
    .addNode("run_commands", runValidationCommandsNode)
    .addNode("create_artifact", createValidationArtifactNode)
    .addNode("persist_result", persistValidationResultNode)
    .addEdge(START, "load_context")
    .addEdge("load_context", "load_patch_task")
    .addEdge("load_patch_task", "plan_commands")
    .addEdge("plan_commands", "run_commands")
    .addEdge("run_commands", "create_artifact")
    .addEdge("create_artifact", "persist_result")
    .addEdge("persist_result", END)
    .compile();
}
