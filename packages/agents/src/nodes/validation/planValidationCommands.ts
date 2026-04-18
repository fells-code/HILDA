import fs from "node:fs/promises";
import { TaskTrace } from "@hilda/db";
import type { ValidationGraphState } from "../../state/validationState";

export async function planValidationCommandsNode(
  state: ValidationGraphState,
): Promise<Partial<ValidationGraphState>> {
  if (!state.packageJsonPath) {
    throw new Error("packageJsonPath is missing from graph state");
  }

  const packageJsonRaw = await fs
    .readFile(state.packageJsonPath, "utf8")
    .catch(() => {
      throw new Error(
        "No package.json found in indexed repository working path",
      );
    });

  const packageJson = JSON.parse(packageJsonRaw) as {
    scripts?: Record<string, string>;
  };

  const commandsToRun: Array<{ command: string; args: string[] }> = [];

  if (packageJson.scripts?.lint) {
    commandsToRun.push({
      command: "pnpm",
      args: ["lint"],
    });
  }

  if (packageJson.scripts?.typecheck) {
    commandsToRun.push({
      command: "pnpm",
      args: ["typecheck"],
    });
  }

  if (state.testCommand?.trim()) {
    const [command, ...args] = state.testCommand.trim().split(/\s+/);
    commandsToRun.push({
      command,
      args,
    });
  }

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_validation_commands_planned",
    eventDataJson: {
      commands: commandsToRun.map((entry) =>
        `${entry.command} ${entry.args.join(" ")}`.trim(),
      ),
    },
  });

  return {
    commandsToRun,
  };
}
