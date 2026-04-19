import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceData } from "./useWorkspaceData";
import {
  askRepository,
  getRepositoryIndexStatus,
  getRepositoryMetadata,
  listRepositories,
  listWorkspaces,
  pickLocalDirectory,
  type AnalysisResult,
  type Repository,
  type RepositoryIndex,
  type Workspace,
} from "../lib/api";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");

  return {
    ...actual,
    askRepository: vi.fn(),
    createRepository: vi.fn(),
    createWorkspace: vi.fn(),
    deleteRepository: vi.fn(),
    getRepositoryIndexStatus: vi.fn(),
    getRepositoryMetadata: vi.fn(),
    listRepositories: vi.fn(),
    listWorkspaces: vi.fn(),
    pickLocalDirectory: vi.fn(),
  };
});

const workspace: Workspace = {
  id: "workspace-1",
  name: "Workspace One",
  ownerId: "user-1",
  createdAt: "2026-04-19T12:00:00.000Z",
  updatedAt: "2026-04-19T12:00:00.000Z",
};

const repository: Repository = {
  id: "repo-1",
  workspaceId: "workspace-1",
  provider: "github",
  name: "demo-repo",
  defaultBranch: "main",
  cloneUrl: "https://github.com/acme/demo-repo.git",
  localPath: null,
  externalId: null,
  status: "indexed",
  createdAt: "2026-04-19T12:00:00.000Z",
  updatedAt: "2026-04-19T12:00:00.000Z",
};

const repositoryIndex: RepositoryIndex = {
  id: "index-1",
  repositoryId: "repo-1",
  commitSha: "abc123",
  status: "indexed",
  summary: "Indexed successfully",
  indexedAt: "2026-04-19T12:05:00.000Z",
  createdAt: "2026-04-19T12:05:00.000Z",
  updatedAt: "2026-04-19T12:05:00.000Z",
};

const overview: AnalysisResult = {
  title: "Repository overview",
  answer: "This is a TypeScript service.",
  metrics: [{ label: "Files scanned", value: "42" }],
  sections: [{ title: "Purpose", items: ["Builds a service"] }],
  evidence: [{ label: "Manifest", value: "package.json:1" }],
};

describe("useWorkspaceData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads workspaces, repositories, overview, and metadata for the selected repo", async () => {
    vi.mocked(listWorkspaces).mockResolvedValue({
      ok: true,
      workspaces: [workspace],
    });
    vi.mocked(listRepositories).mockResolvedValue({
      ok: true,
      repositories: [repository],
    });
    vi.mocked(getRepositoryIndexStatus).mockResolvedValue({
      ok: true,
      repository: {
        id: repository.id,
        name: repository.name,
        status: repository.status,
      },
      index: repositoryIndex,
    });
    vi.mocked(askRepository).mockResolvedValue({
      ok: true,
      taskId: "task-1",
      route: "repo_analysis",
      analysisIntent: "codebase_summary",
      repository: {
        id: repository.id,
        name: repository.name,
      },
      result: overview,
    });
    vi.mocked(getRepositoryMetadata).mockResolvedValue({
      ok: true,
      metadata: {
        sourceType: "github",
        githubIssuesOpen: 7,
      },
    });

    const setError = vi.fn();
    const { result } = renderHook(() => useWorkspaceData({ setError }));

    await waitFor(() => {
      expect(result.current.selectedWorkspace?.id).toBe(workspace.id);
      expect(result.current.selectedRepository?.id).toBe(repository.id);
      expect(result.current.selectedRepositoryOverview).toEqual(overview);
      expect(result.current.selectedRepositoryMetadata?.githubIssuesOpen).toBe(7);
    });

    expect(listWorkspaces).toHaveBeenCalledTimes(1);
    expect(listRepositories).toHaveBeenCalledWith(workspace.id);
    expect(getRepositoryIndexStatus).toHaveBeenCalledWith(repository.id);
    expect(askRepository).toHaveBeenCalledWith({
      repositoryId: repository.id,
      prompt: "repository overview",
    });
    expect(getRepositoryMetadata).toHaveBeenCalledWith(repository.id);
  });

  it("fills the local repository form from the directory picker", async () => {
    vi.mocked(listWorkspaces).mockResolvedValue({
      ok: true,
      workspaces: [],
    });
    vi.mocked(pickLocalDirectory).mockResolvedValue({
      ok: true,
      localPath: "/Users/demo/projects/rust-cli",
    });

    const { result } = renderHook(() => useWorkspaceData({ setError: vi.fn() }));

    await waitFor(() => {
      expect(result.current.loadingWorkspaces).toBe(false);
    });

    await act(async () => {
      await result.current.handlePickLocalDirectory();
    });

    expect(result.current.repositoryForm.provider).toBe("local");
    expect(result.current.repositoryForm.localPath).toBe("/Users/demo/projects/rust-cli");
    expect(result.current.repositoryForm.name).toBe("rust-cli");
  });
});
