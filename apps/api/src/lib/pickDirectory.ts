import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function pickDirectory(): Promise<string | null> {
  switch (os.platform()) {
    case "darwin":
      return pickDirectoryMac();
    default:
      throw new Error("Directory picker is not supported on this platform");
  }
}

async function pickDirectoryMac(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("osascript", [
      "-e",
      'POSIX path of (choose folder with prompt "Select a local repository")',
    ]);

    const directory = stdout.trim();
    return directory.length > 0 ? directory : null;
  } catch (error) {
    const maybeError = error as NodeJS.ErrnoException & { code?: number | string };

    if (String(maybeError.code) === "1") {
      return null;
    }

    throw error;
  }
}
