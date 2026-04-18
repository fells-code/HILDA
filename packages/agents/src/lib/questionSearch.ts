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

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mdx",
  ".txt",
  ".sql",
  ".yml",
  ".yaml",
  ".sh",
]);

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "what",
  "where",
  "when",
  "how",
  "why",
  "does",
  "have",
  "about",
  "there",
  "would",
  "could",
  "should",
  "feature",
  "debug",
  "issue",
  "error",
  "repo",
  "repository",
  "codebase",
  "code",
]);

const MAX_CHUNK_LINES = 40;
const CHUNK_OVERLAP_LINES = 8;
const MAX_MATCHES = 10;

export interface SearchMatch {
  path: string;
  score: number;
  snippet: string;
  lineStart: number;
  lineEnd: number;
  chunkId: string;
  reasons: string[];
}

interface SearchChunk {
  path: string;
  lineStart: number;
  lineEnd: number;
  content: string;
  chunkId: string;
}

export async function walkTextFiles(
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
      await walkTextFiles(fullPath, root, results);
      continue;
    }

    const relativePath = path.relative(root, fullPath);
    const ext = path.extname(relativePath);

    if (TEXT_EXTENSIONS.has(ext)) {
      results.push(relativePath);
    }
  }
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_/-]/g, "");
}

function extractQueryTerms(question: string): string[] {
  const rawTerms = question
    .split(/\s+/)
    .map((term) => normalizeToken(term))
    .filter((term) => term.length >= 2);

  const filteredTerms = rawTerms.filter((term) => !STOP_WORDS.has(term));

  return [...new Set(filteredTerms.length > 0 ? filteredTerms : rawTerms)].slice(
    0,
    12,
  );
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) {
    return 0;
  }

  let index = 0;
  let count = 0;

  while (true) {
    index = haystack.indexOf(needle, index);

    if (index === -1) {
      break;
    }

    count += 1;
    index += needle.length;
  }

  return count;
}

function buildChunks(relativePath: string, content: string): SearchChunk[] {
  const lines = content.split("\n");

  if (lines.length <= MAX_CHUNK_LINES) {
    return [
      {
        path: relativePath,
        lineStart: 1,
        lineEnd: lines.length,
        content,
        chunkId: `${relativePath}:1-${lines.length}`,
      },
    ];
  }

  const chunks: SearchChunk[] = [];
  const step = MAX_CHUNK_LINES - CHUNK_OVERLAP_LINES;

  for (let start = 0; start < lines.length; start += step) {
    const end = Math.min(lines.length, start + MAX_CHUNK_LINES);
    const chunkLines = lines.slice(start, end);

    chunks.push({
      path: relativePath,
      lineStart: start + 1,
      lineEnd: end,
      content: chunkLines.join("\n"),
      chunkId: `${relativePath}:${start + 1}-${end}`,
    });

    if (end >= lines.length) {
      break;
    }
  }

  return chunks;
}

function buildSnippet(chunk: SearchChunk, terms: string[]): string {
  const lines = chunk.content.split("\n");
  const lowerContent = chunk.content.toLowerCase();
  let focusLineIndex = 0;

  for (const term of terms) {
    const index = lowerContent.indexOf(term.toLowerCase());

    if (index !== -1) {
      let runningLength = 0;

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        runningLength += lines[lineIndex].length + 1;

        if (runningLength > index) {
          focusLineIndex = lineIndex;
          break;
        }
      }

      break;
    }
  }

  const start = Math.max(0, focusLineIndex - 2);
  const end = Math.min(lines.length, focusLineIndex + 3);

  return lines
    .slice(start, end)
    .map((line, index) => `${chunk.lineStart + start + index}: ${line}`)
    .join("\n")
    .trim();
}

function scoreChunk(
  chunk: SearchChunk,
  question: string,
  terms: string[],
): SearchMatch | null {
  const reasons: string[] = [];
  let score = 0;

  const lowerPath = chunk.path.toLowerCase();
  const fileName = path.basename(lowerPath);
  const lowerContent = chunk.content.toLowerCase();
  const normalizedQuestion = question.toLowerCase().trim();

  if (normalizedQuestion && lowerContent.includes(normalizedQuestion)) {
    score += 12;
    reasons.push("exact phrase match in chunk");
  }

  for (const term of terms) {
    const contentCount = countOccurrences(lowerContent, term);
    const pathCount = countOccurrences(lowerPath, term);
    const fileNameCount = countOccurrences(fileName, term);

    if (fileNameCount > 0) {
      score += 8 + fileNameCount * 3;
      reasons.push(`filename matched "${term}"`);
    } else if (pathCount > 0) {
      score += 5 + pathCount * 2;
      reasons.push(`path matched "${term}"`);
    }

    if (contentCount > 0) {
      score += Math.min(8, contentCount * 2);
      reasons.push(`content matched "${term}" ${contentCount}x`);
    }
  }

  const distinctTermHits = terms.filter(
    (term) => lowerPath.includes(term) || lowerContent.includes(term),
  ).length;

  if (distinctTermHits >= 2) {
    score += distinctTermHits * 2;
    reasons.push(`matched ${distinctTermHits} distinct query terms`);
  }

  if (chunk.path.toLowerCase().includes("readme")) {
    score += 2;
    reasons.push("documentation context");
  }

  if (score <= 0) {
    return null;
  }

  return {
    path: chunk.path,
    score,
    snippet: buildSnippet(chunk, terms),
    lineStart: chunk.lineStart,
    lineEnd: chunk.lineEnd,
    chunkId: chunk.chunkId,
    reasons: [...new Set(reasons)].slice(0, 4),
  };
}

export async function searchRepository(
  repoPath: string,
  question: string,
): Promise<{
  filesScanned: number;
  matches: SearchMatch[];
}> {
  const files: string[] = [];
  await walkTextFiles(repoPath, repoPath, files);

  const terms = extractQueryTerms(question);
  const matches: SearchMatch[] = [];

  for (const relativePath of files) {
    const absolutePath = path.join(repoPath, relativePath);
    const content = await fs.readFile(absolutePath, "utf8");
    const chunks = buildChunks(relativePath, content);

    for (const chunk of chunks) {
      const match = scoreChunk(chunk, question, terms);

      if (match) {
        matches.push(match);
      }
    }
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (a.path !== b.path) {
      return a.path.localeCompare(b.path);
    }

    return a.lineStart - b.lineStart;
  });

  return {
    filesScanned: files.length,
    matches: matches.slice(0, MAX_MATCHES),
  };
}
