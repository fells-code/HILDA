import fs from "node:fs/promises";
import { TaskTrace } from "@hilda/db";
import type { ValidationGraphState } from "../../state/validationState";

const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".yml",
  ".yaml",
  ".sql",
  ".sh",
]);

const DOC_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);

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
  const impactedFiles = state.patchImpactedFiles ?? [];
  const getExtension = (file: string) => {
    const lastDot = file.lastIndexOf(".");
    return lastDot >= 0 ? file.slice(lastDot) : "";
  };
  const docsOnly =
    impactedFiles.length > 0 &&
    impactedFiles.every((file) => DOC_EXTENSIONS.has(getExtension(file)));
  const hasCodeChanges =
    impactedFiles.length === 0 ||
    impactedFiles.some((file) => {
      const extension = getExtension(file);
      return CODE_EXTENSIONS.has(extension) || file.endsWith("package.json");
    });

  if (hasCodeChanges && packageJson.scripts?.lint) {
    commandsToRun.push({
      command: "pnpm",
      args: ["lint"],
    });
  }

  if (hasCodeChanges && packageJson.scripts?.typecheck) {
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
  } else if (hasCodeChanges && !docsOnly && packageJson.scripts?.test) {
    commandsToRun.push({
      command: "pnpm",
      args: ["test"],
    });
  }

  await TaskTrace.create({
    taskId: state.taskId,
    eventType: "graph_validation_commands_planned",
    eventDataJson: {
      docsOnly,
      hasCodeChanges,
      impactedFiles,
      commands: commandsToRun.map((entry) =>
        `${entry.command} ${entry.args.join(" ")}`.trim(),
      ),
    },
  });

  return {
    commandsToRun,
  };
}
