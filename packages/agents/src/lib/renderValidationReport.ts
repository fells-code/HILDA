import type { ValidationCommandResult } from "../state/validationState";

export function renderValidationReport(results: ValidationCommandResult[]): string {
  if (results.length === 0) {
    return "No validation commands were run.";
  }

  const passed = results.filter((result) => result.success);
  const failed = results.filter((result) => !result.success);
  const summary = [
    "Validation summary",
    `Passed: ${passed.length}`,
    `Failed: ${failed.length}`,
    failed.length > 0
      ? `Failed commands: ${failed.map((result) => result.command).join(", ")}`
      : "All commands passed.",
  ].join("\n");

  const details = results
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

  return `${summary}\n\n========================================\n\n${details}`;
}
