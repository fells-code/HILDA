import fs from "node:fs/promises";
import path from "node:path";
import { buildPatchDraft, type PatchPlanContext } from "./buildPatchDraft";
import { getOpenAIClient, getPatchModel } from "./openai";
import type { PatchEvidence, PatchDraftMetadata } from "../state/patchState";

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean))];
}

async function readCandidateFiles(
  repoPath: string,
  paths: string[],
): Promise<Array<{ path: string; content: string }>> {
  const candidates = [];

  for (const relativePath of uniquePaths(paths).slice(0, 6)) {
    try {
      const absolutePath = path.join(repoPath, relativePath);
      const content = await fs.readFile(absolutePath, "utf8");
      candidates.push({
        path: relativePath,
        content: content.slice(0, 14000),
      });
    } catch {
      continue;
    }
  }

  return candidates;
}

function stripCodeFences(value: string): string {
  return value
    .replace(/^```diff\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export async function generatePatchDiff(
  prompt: string,
  plan: PatchPlanContext,
  evidence: PatchEvidence[],
  repoPath: string,
): Promise<{
  patchDraft: string;
  metadata: PatchDraftMetadata;
}> {
  const candidatePaths = uniquePaths([
    ...plan.impactedFiles,
    ...evidence.map((match) => match.path),
  ]);
  const candidateFiles = await readCandidateFiles(repoPath, candidatePaths);

  try {
    const client = getOpenAIClient();
    const model = getPatchModel();

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "developer",
          content: [
            "You are HILDA, a human-in-the-loop engineering assistant.",
            "Return only a unified diff patch with no prose or code fences.",
            "Prefer the minimum safe change that satisfies the requested plan.",
            "Do not invent files unless a small new file is clearly helpful.",
            "Only modify files shown in the candidate file list unless a new file is necessary.",
            "The diff must be valid enough for git apply when possible.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Requested change:\n${prompt}`,
            "",
            `Plan summary:\n${plan.summary}`,
            "",
            "Planned impacted files:",
            ...plan.impactedFiles.map((file) => `- ${file}`),
            "",
            "Planned implementation steps:",
            ...plan.steps.map((step, index) => `${index + 1}. ${step}`),
            "",
            "Supporting evidence:",
            ...evidence
              .slice(0, 6)
              .map(
                (match) =>
                  `- ${match.path} (score ${match.score})\n${match.snippet}`,
              ),
            "",
            "Candidate file contents:",
            ...candidateFiles.map((file) =>
              [`File: ${file.path}`, file.content].join("\n"),
            ),
          ].join("\n"),
        },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Patch model returned no content");
    }

    return {
      patchDraft: stripCodeFences(content),
      metadata: {
        mode: "llm",
        model,
        candidateFiles: candidateFiles.map((file) => file.path),
      },
    };
  } catch {
    return {
      patchDraft: buildPatchDraft(prompt, plan, evidence),
      metadata: {
        mode: "fallback",
        candidateFiles: candidateFiles.map((file) => file.path),
      },
    };
  }
}
