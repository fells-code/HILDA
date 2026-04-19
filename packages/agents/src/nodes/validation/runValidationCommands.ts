import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { TaskTrace } from "@hilda/db";
import { runCommand } from "../../lib/runCommand";
import type { ValidationGraphState } from "../../state/validationState";

const COPY_IGNORED_DIRS = new Set([".git", "dist", "build", "coverage", ".turbo"]);

async function copyRepository(source: string, target: string): Promise<void> {
  await fs.cp(source, target, {
    recursive: true,
    filter: (entry) => {
      const name = path.basename(entry);
      return !COPY_IGNORED_DIRS.has(name);
    },
  });
}

export async function runValidationCommandsNode(
  state: ValidationGraphState,
): Promise<Partial<ValidationGraphState>> {
  if (!state.repoPath) {
    throw new Error("Repository path is missing from graph state");
  }

  if (!state.patchDraft) {
    throw new Error("Patch draft is missing from graph state");
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hilda-validate-"));
  const validationRepoPath = path.join(tempRoot, "repo");
  const results = [];

  try {
    await copyRepository(state.repoPath, validationRepoPath);

    const patchFilePath = path.join(tempRoot, "proposal.diff");
    await fs.writeFile(patchFilePath, state.patchDraft, "utf8");

    const applyCheck = await runCommand(validationRepoPath, "git", [
      "apply",
      "--check",
      "--whitespace=nowarn",
      patchFilePath,
    ]);
    results.push(applyCheck);

    if (!applyCheck.success) {
      await TaskTrace.create({
        taskId: state.taskId,
        eventType: "graph_validation_patch_apply_failed",
        eventDataJson: {
          patchArtifactId: state.patchArtifactId ?? null,
        },
      });

      return {
        validationRepoPath,
        commandResults: results,
        success: false,
      };
    }

    const applyPatch = await runCommand(validationRepoPath, "git", [
      "apply",
      "--whitespace=nowarn",
      patchFilePath,
    ]);
    results.push(applyPatch);

    if (!applyPatch.success) {
      return {
        validationRepoPath,
        commandResults: results,
        success: false,
      };
    }

    for (const entry of state.commandsToRun) {
      const result = await runCommand(validationRepoPath, entry.command, entry.args);
      results.push(result);
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {
      return;
    });
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
    validationRepoPath,
    commandResults: results,
    success: results.every((result) => result.success),
  };
}
