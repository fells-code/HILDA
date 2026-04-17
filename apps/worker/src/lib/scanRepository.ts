import fs from "node:fs/promises";
import path from "node:path";

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".next",
]);

const DOC_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);
const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".sql",
  ".yml",
  ".yaml",
  ".sh",
]);

export interface RepositoryScanSummary {
  totalFiles: number;
  codeFiles: number;
  docFiles: number;
  topLevelEntries: string[];
  sampleDocs: string[];
  sampleCode: string[];
}

async function walk(
  dir: string,
  root: string,
  results: string[],
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(fullPath, root, results);
      continue;
    }

    results.push(path.relative(root, fullPath));
  }
}

export async function scanRepository(
  root: string,
): Promise<RepositoryScanSummary> {
  const files: string[] = [];
  await walk(root, root, files);

  const codeFiles = files.filter((file) =>
    CODE_EXTENSIONS.has(path.extname(file)),
  );
  const docFiles = files.filter((file) =>
    DOC_EXTENSIONS.has(path.extname(file)),
  );

  const topLevelEntries = await fs.readdir(root);

  return {
    totalFiles: files.length,
    codeFiles: codeFiles.length,
    docFiles: docFiles.length,
    topLevelEntries: topLevelEntries.slice(0, 25),
    sampleDocs: docFiles.slice(0, 15),
    sampleCode: codeFiles.slice(0, 15),
  };
}

export function buildRepositorySummary(scan: RepositoryScanSummary): string {
  return [
    `Indexed ${scan.totalFiles} files.`,
    `Code files: ${scan.codeFiles}.`,
    `Doc files: ${scan.docFiles}.`,
    `Top-level entries: ${scan.topLevelEntries.join(", ") || "none"}.`,
    `Sample docs: ${scan.sampleDocs.join(", ") || "none"}.`,
    `Sample code: ${scan.sampleCode.join(", ") || "none"}.`,
  ].join(" ");
}
