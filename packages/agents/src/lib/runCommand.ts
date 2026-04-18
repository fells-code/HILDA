import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ValidationCommandResult } from "../state/validationState";

const execFileAsync = promisify(execFile);

export async function runCommand(
  cwd: string,
  command: string,
  args: string[],
): Promise<ValidationCommandResult> {
  try {
    const result = await execFileAsync(command, args, {
      cwd,
      timeout: 120000,
      maxBuffer: 1024 * 1024,
    });

    return {
      command: `${command} ${args.join(" ")}`.trim(),
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      success: true,
    };
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };

    return {
      command: `${command} ${args.join(" ")}`.trim(),
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? "",
      success: false,
    };
  }
}
