import fs from "node:fs/promises";
import path from "node:path";
import {
  listVisibleRepositoryFiles,
  listVisibleTopLevelEntries,
} from "@hilda/shared";

export async function listAllFiles(repoPath: string): Promise<string[]> {
  return listVisibleRepositoryFiles(repoPath);
}

export async function countTestFiles(repoPath: string) {
  const files = await listAllFiles(repoPath);

  const testFiles = files.filter((file) => {
    const lower = file.toLowerCase();

    return (
      lower.includes("/test/") ||
      lower.includes("/tests/") ||
      lower.endsWith(".test.ts") ||
      lower.endsWith(".test.tsx") ||
      lower.endsWith(".test.js") ||
      lower.endsWith(".test.jsx") ||
      lower.endsWith(".spec.ts") ||
      lower.endsWith(".spec.tsx") ||
      lower.endsWith(".spec.js") ||
      lower.endsWith(".spec.jsx")
    );
  });

  return {
    count: testFiles.length,
    sample: testFiles.slice(0, 25),
  };
}

export async function listPackageScripts(repoPath: string) {
  const packageJsonPath = path.join(repoPath, "package.json");
  const raw = await fs.readFile(packageJsonPath, "utf8");
  const pkg = JSON.parse(raw) as {
    scripts?: Record<string, string>;
  };

  return pkg.scripts ?? {};
}

export async function summarizeStructure(repoPath: string) {
  const files = await listAllFiles(repoPath);
  const topLevelEntries = listVisibleTopLevelEntries(files);

  const packageLikeDirs = topLevelEntries.filter((entry) =>
    [
      "apps",
      "packages",
      "services",
      "src",
      "docs",
      "scripts",
      "test",
      "tests",
    ].includes(entry.toLowerCase()),
  );

  const markdownFiles = files.filter((file) =>
    file.toLowerCase().endsWith(".md"),
  );
  const tsFiles = files.filter(
    (file) =>
      file.toLowerCase().endsWith(".ts") || file.toLowerCase().endsWith(".tsx"),
  );

  return {
    totalFiles: files.length,
    topLevelEntries: topLevelEntries.slice(0, 25),
    packageLikeDirs,
    markdownCount: markdownFiles.length,
    tsCount: tsFiles.length,
    sampleDocs: markdownFiles.slice(0, 10),
  };
}
