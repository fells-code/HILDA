import type { ValidationCommandResult } from "../state/validationState";

export function renderValidationReport(
  results: ValidationCommandResult[],
): string {
  if (results.length === 0) {
    return "No validation commands were run.";
  }

  return results
    .map((result) => {
      return [
        `$ ${result.command}`,
        `success: ${result.success}`,
        "",
        "stdout:",
        result.stdout || "(none)",
        "",
        "stderr:",
        result.stderr || "(none)",
      ].join("\n");
    })
    .join("\n\n----------------------------------------\n\n");
}
