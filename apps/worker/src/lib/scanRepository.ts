import path from "node:path";
import { listVisibleRepositoryFiles, listVisibleTopLevelEntries } from "@hilda/shared";

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

export async function scanRepository(root: string): Promise<RepositoryScanSummary> {
  const files = await listVisibleRepositoryFiles(root);

  const codeFiles = files.filter((file) => CODE_EXTENSIONS.has(path.extname(file)));
  const docFiles = files.filter((file) => DOC_EXTENSIONS.has(path.extname(file)));

  return {
    totalFiles: files.length,
    codeFiles: codeFiles.length,
    docFiles: docFiles.length,
    topLevelEntries: listVisibleTopLevelEntries(files),
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
