import { TaskTrace } from "@hilda/db";
import { runCommand } from "../../lib/runCommand";
import type { ValidationGraphState } from "../../state/validationState";

export async function runValidationCommandsNode(
  state: ValidationGraphState,
): Promise<Partial<ValidationGraphState>> {
  if (!state.repoPath) {
    throw new Error("Repository path is missing from graph state");
  }

  const results = [];

  for (const entry of state.commandsToRun) {
    const result = await runCommand(state.repoPath, entry.command, entry.args);
    results.push(result);
  }

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_validation_commands_executed",
    eventDataJson: {
      commandCount: results.length,
      commands: results.map((result) => ({
        command: result.command,
        success: result.success,
      })),
    },
  });

  return {
    commandResults: results,
    success: results.every((result) => result.success),
  };
}
