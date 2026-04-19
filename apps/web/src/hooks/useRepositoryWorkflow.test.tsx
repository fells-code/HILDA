import { act, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRepositoryWorkflow } from "./useRepositoryWorkflow";
import {
  askRepository,
  createPatch,
  getTask,
  type AnalysisResult,
  type ApprovalRequest,
  type GeneratedPlan,
  type PatchArtifact,
  type TaskTrace,
} from "../lib/api";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");

  return {
    ...actual,
    askRepository: vi.fn(),
    createPatch: vi.fn(),
    createValidation: vi.fn(),
    getTask: vi.fn(),
    updateApprovalRequest: vi.fn(),
    updatePatchApprovalRequest: vi.fn(),
  };
});

const traces: TaskTrace[] = [
  {
    id: "trace-1",
    taskId: "task-1",
    eventType: "node_completed",
    eventDataJson: { node: "synthesize" },
    createdAt: "2026-04-19T12:10:00.000Z",
    updatedAt: "2026-04-19T12:10:00.000Z",
  },
];

const plan: GeneratedPlan = {
  summary: "Add a command to print repository status.",
  assumptions: ["The CLI already has a command registry."],
  impactedFiles: ["src/main.ts"],
  steps: ["Add a status command."],
  risks: ["Output shape may change."],
  validation: ["cargo test"],
};

const approvedPlanApproval: ApprovalRequest = {
  id: "approval-1",
  taskId: "plan-task",
  approvalType: "plan",
  summary: "Approve plan",
  payloadJson: {},
  status: "approved",
  createdAt: "2026-04-19T12:10:00.000Z",
  updatedAt: "2026-04-19T12:10:00.000Z",
};

const patchArtifact: PatchArtifact = {
  id: "artifact-1",
  taskId: "patch-task",
  repositoryId: "repo-1",
  artifactType: "patch",
  title: "Patch diff",
  content: "diff --git a/src/main.ts b/src/main.ts",
  metadataJson: {},
  createdAt: "2026-04-19T12:15:00.000Z",
  updatedAt: "2026-04-19T12:15:00.000Z",
};

function createFormEvent() {
  return {
    preventDefault: vi.fn(),
  } as unknown as FormEvent<HTMLFormElement>;
}

describe("useRepositoryWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes repository overview answers into chat and overview updates", async () => {
    const overview: AnalysisResult = {
      title: "Repo overview",
      answer: "This looks like a Rust CLI tool.",
      sections: [{ title: "Purpose", items: ["CLI for repository tasks"] }],
      evidence: [{ label: "Manifest", value: "Cargo.toml:1" }],
    };

    vi.mocked(askRepository).mockResolvedValue({
      ok: true,
      taskId: "task-1",
      route: "repo_analysis",
      analysisIntent: "codebase_summary",
      repository: {
        id: "repo-1",
        name: "demo-cli",
      },
      result: overview,
    });
    vi.mocked(getTask).mockResolvedValue({
      ok: true,
      task: {
        id: "task-1",
        status: "completed",
        input: {},
        output: {},
        createdAt: "2026-04-19T12:10:00.000Z",
        updatedAt: "2026-04-19T12:10:00.000Z",
      },
      repository: null,
      traces,
      approvals: [],
      artifacts: [],
    });

    const onRepositoryOverviewUpdated = vi.fn();
    const { result } = renderHook(() =>
      useRepositoryWorkflow({
        selectedRepositoryId: "repo-1",
        setError: vi.fn(),
        onRepositoryOverviewUpdated,
      }),
    );

    act(() => {
      result.current.setQuestion("what is this codebase?");
    });

    await act(async () => {
      await result.current.handleAskQuestion(createFormEvent());
    });

    await waitFor(() => {
      expect(onRepositoryOverviewUpdated).toHaveBeenCalledWith("repo-1", overview);
      expect(result.current.chatHistory).toHaveLength(2);
    });

    expect(result.current.questionAnswer).toContain("Updated the repository overview");
    expect(result.current.activeWorkflowPanel).toBe("question");
    expect(result.current.taskTraces).toEqual(traces);
  });

  it("creates a patch after an approved plan response", async () => {
    vi.mocked(askRepository).mockResolvedValue({
      ok: true,
      taskId: "plan-task",
      route: "plan",
      planIntent: "feature_request",
      repository: {
        id: "repo-1",
        name: "demo-cli",
      },
      approvalRequestId: approvedPlanApproval.id,
      matches: [],
      plan,
      answer: "Here is the proposed plan.",
    });
    vi.mocked(getTask)
      .mockResolvedValueOnce({
        ok: true,
        task: {
          id: "plan-task",
          status: "completed",
          input: {},
          output: {},
          createdAt: "2026-04-19T12:10:00.000Z",
          updatedAt: "2026-04-19T12:10:00.000Z",
        },
        repository: null,
        traces,
        approvals: [approvedPlanApproval],
        artifacts: [],
      })
      .mockResolvedValueOnce({
        ok: true,
        task: {
          id: "plan-task",
          status: "completed",
          input: {},
          output: {},
          createdAt: "2026-04-19T12:10:00.000Z",
          updatedAt: "2026-04-19T12:10:00.000Z",
        },
        repository: null,
        traces,
        approvals: [approvedPlanApproval],
        artifacts: [],
      })
      .mockResolvedValueOnce({
        ok: true,
        task: {
          id: "patch-task",
          status: "completed",
          input: {},
          output: {},
          createdAt: "2026-04-19T12:15:00.000Z",
          updatedAt: "2026-04-19T12:15:00.000Z",
        },
        repository: null,
        traces,
        approvals: [],
        artifacts: [patchArtifact],
      });
    vi.mocked(createPatch).mockResolvedValue({
      ok: true,
      taskId: "patch-task",
      approvalRequestId: "patch-approval",
      artifact: patchArtifact,
    });

    const { result } = renderHook(() =>
      useRepositoryWorkflow({
        selectedRepositoryId: "repo-1",
        setError: vi.fn(),
        onRepositoryOverviewUpdated: vi.fn(),
      }),
    );

    act(() => {
      result.current.setQuestion("add a status command");
    });

    await act(async () => {
      await result.current.handleAskQuestion(createFormEvent());
    });

    await waitFor(() => {
      expect(result.current.latestPlan?.summary).toBe(plan.summary);
      expect(result.current.latestPlanApprovals[0]?.status).toBe("approved");
    });

    await act(async () => {
      await result.current.handleCreatePatch();
    });

    await waitFor(() => {
      expect(createPatch).toHaveBeenCalledWith({
        repositoryId: "repo-1",
        approvedPlanTaskId: "plan-task",
        prompt: plan.summary,
        evidence: [],
      });
      expect(result.current.latestPatchArtifacts).toEqual([patchArtifact]);
    });

    expect(result.current.activeWorkflowPanel).toBe("patch");
    expect(result.current.chatHistory.at(-1)?.title).toBe("Patch draft ready");
  });
});
