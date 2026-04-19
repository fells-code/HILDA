import { describe, expect, it } from "vitest";
import type { AnalysisResult, Repository } from "./api";
import {
  extractRepositoryDescription,
  extractToolingNames,
  formatIssueCount,
  formatOverviewChatBody,
} from "./overview";

const overview: AnalysisResult = {
  title: "Repository overview",
  answer:
    "This is a TypeScript monorepo for a human-in-the-loop development platform. It has a web app, API, and worker.",
  sections: [
    {
      title: "Purpose",
      items: ["A human-in-the-loop development agent platform."],
    },
    {
      title: "Architecture",
      items: ["Monorepo with apps/web, apps/api, and apps/worker."],
    },
    {
      title: "Frameworks and tooling",
      items: ["Detected: React, Vite, LangGraph"],
    },
    {
      title: "Observed gaps and issues",
      items: ["Some workflows still need stronger test coverage."],
    },
  ],
  evidence: [{ label: "Manifest", value: "package.json:1" }],
};

describe("overview helpers", () => {
  it("builds a concise labeled chat summary", () => {
    expect(formatOverviewChatBody(overview)).toBe(
      [
        "Summary: A human-in-the-loop development agent platform.",
        "Architecture: Monorepo with apps/web, apps/api, and apps/worker.",
        "Tooling: Detected: React, Vite, LangGraph",
        "Risks: Some workflows still need stronger test coverage.",
      ].join("\n\n"),
    );
  });

  it("extracts repo description, tooling names, and issue counts", () => {
    const githubRepository: Repository = {
      id: "repo-1",
      workspaceId: "workspace-1",
      provider: "github",
      name: "hilda",
      defaultBranch: "main",
      cloneUrl: "https://github.com/acme/hilda.git",
      localPath: null,
      externalId: null,
      status: "indexed",
      createdAt: "2026-04-19T12:00:00.000Z",
      updatedAt: "2026-04-19T12:00:00.000Z",
    };

    expect(extractRepositoryDescription(overview, false)).toBe(
      "A human-in-the-loop development agent platform.",
    );
    expect(extractToolingNames(overview)).toEqual(["React", "Vite", "LangGraph"]);
    expect(
      formatIssueCount(
        githubRepository,
        { sourceType: "github", githubIssuesOpen: 4 },
        false,
      ),
    ).toBe("4");
    expect(formatIssueCount(githubRepository, null, true)).toBe("loading");
  });
});
