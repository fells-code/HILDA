import { END, START, StateGraph } from "@langchain/langgraph";
import { createValidationArtifactNode } from "../nodes/validation/createValidationArtifact";
import { loadPatchTaskContextNode } from "../nodes/validation/loadPatchTaskContext";
import { loadValidationContextNode } from "../nodes/validation/loadValidationContext";
import { persistValidationResultNode } from "../nodes/validation/persistValidationResult";
import { planValidationCommandsNode } from "../nodes/validation/planValidationCommands";
import { runValidationCommandsNode } from "../nodes/validation/runValidationCommands";
import type { ValidationGraphState } from "../state/validationState";

export function createValidationGraph() {
  const graph = new StateGraph<ValidationGraphState>({
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
  });

  graph.addNode("load_context", loadValidationContextNode);
  graph.addNode("load_patch_task", loadPatchTaskContextNode);
  graph.addNode("plan_commands", planValidationCommandsNode);
  graph.addNode("run_commands", runValidationCommandsNode);
  graph.addNode("create_artifact", createValidationArtifactNode);
  graph.addNode("persist_result", persistValidationResultNode);

  graph.addEdge(START, "load_context");
  graph.addEdge("load_context", "load_patch_task");
  graph.addEdge("load_patch_task", "plan_commands");
  graph.addEdge("plan_commands", "run_commands");
  graph.addEdge("run_commands", "create_artifact");
  graph.addEdge("create_artifact", "persist_result");
  graph.addEdge("persist_result", END);

  return graph.compile();
}
