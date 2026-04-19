import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { Card } from "./components/Card";
import { PlanSection } from "./components/PlanSection";
import { StatusBadge } from "./components/StatusBadge";
import {
  AnalysisResult,
  ApprovalRequest,
  askRepository,
  createPatch,
  createRepository,
  createValidation,
  createWorkspace,
  deleteRepository,
  GeneratedPlan,
  getRepositoryIndexStatus,
  getRepositoryMetadata,
  getTask,
  listRepositories,
  listWorkspaces,
  PatchArtifact,
  RepositoryMetadata,
  TaskTrace,
  updateApprovalRequest,
  updatePatchApprovalRequest,
  type QuestionMatch,
  type Repository,
  type RepositoryIndex,
  type Workspace,
} from "./lib/api";

interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  kind: "question" | "plan" | "patch" | "validation" | "system";
  title?: string;
  body: string;
}

function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryIndexes, setRepositoryIndexes] = useState<
    Record<string, RepositoryIndex | null>
  >({});
  const [repositoryOverviewCache, setRepositoryOverviewCache] = useState<
    Record<string, AnalysisResult>
  >({});
  const [repositoryMetadataCache, setRepositoryMetadataCache] = useState<
    Record<string, RepositoryMetadata>
  >({});
  const [loadingOverviewRepositoryId, setLoadingOverviewRepositoryId] =
    useState("");
  const [loadingRepositoryMetadataId, setLoadingRepositoryMetadataId] =
    useState("");
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingRepositories, setLoadingRepositories] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [repositoryForm, setRepositoryForm] = useState({
    provider: "github" as "github" | "local",
    name: "",
    defaultBranch: "main",
    cloneUrl: "",
    localPath: "",
  });
  const [submittingWorkspace, setSubmittingWorkspace] = useState(false);
  const [submittingRepository, setSubmittingRepository] = useState(false);
  const [deletingRepositoryId, setDeletingRepositoryId] = useState("");
  const [error, setError] = useState("");
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
  const [question, setQuestion] = useState("");
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [questionMatches, setQuestionMatches] = useState<QuestionMatch[]>([]);
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [latestTaskId, setLatestTaskId] = useState("");
  const [taskTraces, setTaskTraces] = useState<TaskTrace[]>([]);
  const [latestPlan, setLatestPlan] = useState<GeneratedPlan | null>(null);
  const [latestPlanTaskId, setLatestPlanTaskId] = useState("");
  const [latestPlanApprovalId, setLatestPlanApprovalId] = useState("");
  const [latestPlanApprovals, setLatestPlanApprovals] = useState<
    ApprovalRequest[]
  >([]);
  const [latestPlanTraces, setLatestPlanTraces] = useState<TaskTrace[]>([]);
  const [latestPlanMatches, setLatestPlanMatches] = useState<QuestionMatch[]>(
    [],
  );
  const [creatingPatch, setCreatingPatch] = useState(false);
  const [latestPatchTaskId, setLatestPatchTaskId] = useState("");
  const [latestPatchApprovalId, setLatestPatchApprovalId] = useState("");
  const [latestPatchApprovals, setLatestPatchApprovals] = useState<
    ApprovalRequest[]
  >([]);
  const [latestPatchArtifacts, setLatestPatchArtifacts] = useState<
    PatchArtifact[]
  >([]);
  const [latestPatchTraces, setLatestPatchTraces] = useState<TaskTrace[]>([]);
  const [runningValidation, setRunningValidation] = useState(false);
  const [latestValidationTaskId, setLatestValidationTaskId] = useState("");
  const [latestValidationArtifacts, setLatestValidationArtifacts] = useState<
    PatchArtifact[]
  >([]);
  const [latestValidationTraces, setLatestValidationTraces] = useState<
    TaskTrace[]
  >([]);
  const [validationTestCommand, setValidationTestCommand] = useState("");
  const [activeWorkflowPanel, setActiveWorkflowPanel] = useState<
    "idle" | "question" | "plan" | "patch" | "validation"
  >("idle");
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);

  const selectedWorkspace = useMemo(
    () =>
      workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ??
      null,
    [workspaces, selectedWorkspaceId],
  );

  const selectedRepository = useMemo(
    () =>
      repositories.find((repository) => repository.id === selectedRepositoryId) ??
      null,
    [repositories, selectedRepositoryId],
  );

  const selectedRepositoryIndex = selectedRepository
    ? repositoryIndexes[selectedRepository.id] ?? null
    : null;

  const selectedRepositoryOverview = selectedRepository
    ? repositoryOverviewCache[selectedRepository.id] ?? null
    : null;
  const selectedRepositoryMetadata = selectedRepository
    ? repositoryMetadataCache[selectedRepository.id] ?? null
    : null;

  const shouldPollRepositories = useMemo(
    () =>
      repositories.some((repository) => {
        const index = repositoryIndexes[repository.id] ?? null;

        return (
          repository.status === "queued" ||
          repository.status === "syncing" ||
          index?.status === "queued" ||
          index?.status === "syncing"
        );
      }),
    [repositories, repositoryIndexes],
  );

  function repositoriesEqual(next: Repository[], current: Repository[]) {
    if (next.length !== current.length) {
      return false;
    }

    return next.every((repository, index) => {
      const currentRepository = current[index];

      return (
        currentRepository &&
        repository.id === currentRepository.id &&
        repository.name === currentRepository.name &&
        repository.defaultBranch === currentRepository.defaultBranch &&
        repository.cloneUrl === currentRepository.cloneUrl &&
        repository.localPath === currentRepository.localPath &&
        repository.status === currentRepository.status &&
        repository.updatedAt === currentRepository.updatedAt
      );
    });
  }

  function repositoryIndexesEqual(
    next: Record<string, RepositoryIndex | null>,
    current: Record<string, RepositoryIndex | null>,
  ) {
    const nextKeys = Object.keys(next);
    const currentKeys = Object.keys(current);

    if (nextKeys.length !== currentKeys.length) {
      return false;
    }

    return nextKeys.every((key) => {
      const nextIndex = next[key];
      const currentIndex = current[key];

      if (!nextIndex && !currentIndex) {
        return true;
      }

      if (!nextIndex || !currentIndex) {
        return false;
      }

      return (
        nextIndex.id === currentIndex.id &&
        nextIndex.status === currentIndex.status &&
        nextIndex.summary === currentIndex.summary &&
        nextIndex.commitSha === currentIndex.commitSha &&
        nextIndex.indexedAt === currentIndex.indexedAt &&
        nextIndex.updatedAt === currentIndex.updatedAt
      );
    });
  }

  function appendChatEntry(entry: Omit<ChatEntry, "id">) {
    setChatHistory((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...entry,
      },
    ]);
  }

  async function loadWorkspaces() {
    setLoadingWorkspaces(true);
    setError("");

    try {
      const response = await listWorkspaces();
      setWorkspaces(response.workspaces);

      if (!selectedWorkspaceId && response.workspaces.length > 0) {
        setSelectedWorkspaceId(response.workspaces[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load workspaces",
      );
    } finally {
      setLoadingWorkspaces(false);
    }
  }

  async function loadRepositories(
    workspaceId: string,
    options?: { background?: boolean },
  ) {
    const background = options?.background ?? false;

    if (!background) {
      setLoadingRepositories(true);
    }

    setError("");

    try {
      const response = await listRepositories(workspaceId);
      setRepositories((current) =>
        repositoriesEqual(response.repositories, current)
          ? current
          : response.repositories,
      );

      if (response.repositories.length === 0) {
        setSelectedRepositoryId("");
      } else if (
        !response.repositories.some(
          (repository) => repository.id === selectedRepositoryId,
        )
      ) {
        setSelectedRepositoryId(response.repositories[0].id);
      }

      const indexEntries = await Promise.all(
        response.repositories.map(async (repository) => {
          const status = await getRepositoryIndexStatus(repository.id);
          return [repository.id, status.index] as const;
        }),
      );

      const nextIndexes = Object.fromEntries(indexEntries);

      setRepositoryIndexes((current) =>
        repositoryIndexesEqual(nextIndexes, current) ? current : nextIndexes,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load repositories",
      );
    } finally {
      if (!background) {
        setLoadingRepositories(false);
      }
    }
  }

  async function loadRepositoryOverview(repository: Repository) {
    const index = repositoryIndexes[repository.id] ?? null;

    if (
      repository.status !== "indexed" ||
      index?.status !== "indexed" ||
      repositoryOverviewCache[repository.id] ||
      loadingOverviewRepositoryId === repository.id
    ) {
      return;
    }

    setLoadingOverviewRepositoryId(repository.id);

    try {
      const response = await askRepository({
        repositoryId: repository.id,
        prompt: "repository overview",
      });

      if (response.route === "repo_analysis") {
        setRepositoryOverviewCache((current) => ({
          ...current,
          [repository.id]: response.result,
        }));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate overview",
      );
    } finally {
      setLoadingOverviewRepositoryId("");
    }
  }

  async function loadRepositoryMetadata(repository: Repository) {
    if (
      repositoryMetadataCache[repository.id] ||
      loadingRepositoryMetadataId === repository.id
    ) {
      return;
    }

    setLoadingRepositoryMetadataId(repository.id);

    try {
      const response = await getRepositoryMetadata(repository.id);
      setRepositoryMetadataCache((current) => ({
        ...current,
        [repository.id]: response.metadata,
      }));
    } catch {
      setRepositoryMetadataCache((current) => ({
        ...current,
        [repository.id]: {
          sourceType: repository.provider,
          githubIssuesOpen: null,
        },
      }));
    } finally {
      setLoadingRepositoryMetadataId("");
    }
  }

  async function handleAskQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRepositoryId || !question.trim()) {
      return;
    }

    const prompt = question.trim();
    appendChatEntry({
      role: "user",
      kind: "question",
      body: prompt,
    });

    setAskingQuestion(true);
    setError("");
    setQuestionMatches([]);
    setQuestionAnswer("");
    setTaskTraces([]);

    try {
      const response = await askRepository({
        repositoryId: selectedRepositoryId,
        prompt,
      });

      if (response.route === "repo_analysis") {
        setRepositoryOverviewCache((current) => ({
          ...current,
          [selectedRepositoryId]: response.result,
        }));
        setQuestionAnswer(
          "Updated the repository overview for this repo. Scroll up to the overview panel to review the latest summary.",
        );
        appendChatEntry({
          role: "assistant",
          kind: "system",
          title: "Repository overview refreshed",
          body: response.result.answer,
        });
        setQuestionMatches([]);
        setLatestTaskId(response.taskId);
        setActiveWorkflowPanel("question");
      } else if (response.route === "plan") {
        setLatestPlan(response.plan);
        setLatestPlanTaskId(response.taskId);
        setLatestPlanApprovalId(response.approvalRequestId);
        setLatestPlanMatches(response.matches);
        setQuestionAnswer(response.answer);
        appendChatEntry({
          role: "assistant",
          kind: "plan",
          title: "Plan created",
          body: response.plan.summary,
        });
        setQuestionMatches([]);
        setLatestTaskId(response.taskId);
        setActiveWorkflowPanel("plan");

        const taskResponse = await getTask(response.taskId);
        setLatestPlanTraces(taskResponse.traces);
        setLatestPlanApprovals(taskResponse.approvals);
      } else {
        setQuestionMatches(response.matches);
        setQuestionAnswer(response.answer);
        appendChatEntry({
          role: "assistant",
          kind: "question",
          title: "Grounded answer",
          body: response.answer,
        });
        setLatestTaskId(response.taskId);
        setActiveWorkflowPanel("question");
      }

      const taskResponse = await getTask(response.taskId);
      setTaskTraces(taskResponse.traces);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to search repository",
      );
    } finally {
      setAskingQuestion(false);
    }
  }

  async function handlePlanApproval(status: "approved" | "rejected") {
    if (!latestPlanApprovalId || !latestPlanTaskId) {
      return;
    }

    setError("");

    try {
      await updateApprovalRequest(latestPlanApprovalId, { status });

      const taskResponse = await getTask(latestPlanTaskId);
      setLatestPlanTraces(taskResponse.traces);
      setLatestPlanApprovals(taskResponse.approvals);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update approval",
      );
    }
  }

  async function handleCreatePatch() {
    if (
      !selectedRepositoryId ||
      !latestPlanTaskId ||
      !latestPlan ||
      latestPlanApprovals.every((approval) => approval.status !== "approved")
    ) {
      return;
    }

    setCreatingPatch(true);
    setError("");

    try {
      const response = await createPatch({
        repositoryId: selectedRepositoryId,
        approvedPlanTaskId: latestPlanTaskId,
        prompt: latestPlan.summary,
        evidence: latestPlanMatches,
      });

      setLatestPatchTaskId(response.taskId);
      setLatestPatchApprovalId(response.approvalRequestId);
      setActiveWorkflowPanel("patch");
      appendChatEntry({
        role: "assistant",
        kind: "patch",
        title: "Patch draft ready",
        body: "HILDA generated a reviewable patch diff for the approved plan.",
      });

      const taskResponse = await getTask(response.taskId);
      setLatestPatchApprovals(taskResponse.approvals);
      setLatestPatchArtifacts(taskResponse.artifacts);
      setLatestPatchTraces(taskResponse.traces);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create patch");
    } finally {
      setCreatingPatch(false);
    }
  }

  async function handlePatchApproval(status: "approved" | "rejected") {
    if (!latestPatchApprovalId || !latestPatchTaskId) {
      return;
    }

    setError("");

    try {
      await updatePatchApprovalRequest(latestPatchApprovalId, { status });

      const taskResponse = await getTask(latestPatchTaskId);
      setLatestPatchApprovals(taskResponse.approvals);
      setLatestPatchArtifacts(taskResponse.artifacts);
      setLatestPatchTraces(taskResponse.traces);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update patch approval",
      );
    }
  }

  async function handleRunValidation() {
    if (!selectedRepositoryId || !latestPatchTaskId) {
      return;
    }

    setRunningValidation(true);
    setError("");

    try {
      const response = await createValidation({
        repositoryId: selectedRepositoryId,
        patchTaskId: latestPatchTaskId,
        testCommand: validationTestCommand.trim() || undefined,
      });

      setLatestValidationTaskId(response.taskId);
      setActiveWorkflowPanel("validation");
      appendChatEntry({
        role: "assistant",
        kind: "validation",
        title: "Validation started",
        body: validationTestCommand.trim()
          ? `Running validation with: ${validationTestCommand.trim()}`
          : "Running the default validation loop for the proposed patch.",
      });

      const taskResponse = await getTask(response.taskId);
      setLatestValidationArtifacts(taskResponse.artifacts);
      setLatestValidationTraces(taskResponse.traces);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run validation");
    } finally {
      setRunningValidation(false);
    }
  }

  async function handleCreateWorkspace(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!workspaceName.trim()) {
      return;
    }

    setSubmittingWorkspace(true);
    setError("");

    try {
      const response = await createWorkspace({ name: workspaceName.trim() });
      setWorkspaceName("");
      await loadWorkspaces();
      setSelectedWorkspaceId(response.workspace.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create workspace",
      );
    } finally {
      setSubmittingWorkspace(false);
    }
  }

  async function handleCreateRepository(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedWorkspaceId) {
      return;
    }

    setSubmittingRepository(true);
    setError("");

    try {
      await createRepository({
        workspaceId: selectedWorkspaceId,
        provider: repositoryForm.provider,
        name: repositoryForm.name.trim(),
        defaultBranch: repositoryForm.defaultBranch.trim() || "main",
        cloneUrl:
          repositoryForm.provider === "github"
            ? repositoryForm.cloneUrl.trim() || null
            : null,
        localPath:
          repositoryForm.provider === "local"
            ? repositoryForm.localPath.trim() || null
            : null,
      });

      setRepositoryForm({
        provider: "github",
        name: "",
        defaultBranch: "main",
        cloneUrl: "",
        localPath: "",
      });

      await loadRepositories(selectedWorkspaceId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create repository",
      );
    } finally {
      setSubmittingRepository(false);
    }
  }

  async function handleDeleteRepository(repository: Repository) {
    const confirmed = window.confirm(
      `Delete ${repository.name} from ${selectedWorkspace?.name ?? "this workspace"}? This will remove its indexed data, tasks, traces, artifacts, and local clone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingRepositoryId(repository.id);
    setError("");

    try {
      await deleteRepository(repository.id);

      setRepositories((current) =>
        current.filter((item) => item.id !== repository.id),
      );
      setRepositoryIndexes((current) => {
        const next = { ...current };
        delete next[repository.id];
        return next;
      });
      setRepositoryOverviewCache((current) => {
        const next = { ...current };
        delete next[repository.id];
        return next;
      });
      setRepositoryMetadataCache((current) => {
        const next = { ...current };
        delete next[repository.id];
        return next;
      });
      if (selectedRepositoryId === repository.id) {
        const remainingRepositories = repositories.filter(
          (item) => item.id !== repository.id,
        );
        setSelectedRepositoryId(remainingRepositories[0]?.id ?? "");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete repository",
      );
    } finally {
      setDeletingRepositoryId("");
    }
  }

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setRepositories([]);
      setRepositoryIndexes({});
      setSelectedRepositoryId("");
      return;
    }

    void loadRepositories(selectedWorkspaceId);

    if (!shouldPollRepositories) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadRepositories(selectedWorkspaceId, { background: true });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [selectedWorkspaceId, shouldPollRepositories]);

  useEffect(() => {
    setQuestion("");
    setQuestionMatches([]);
    setQuestionAnswer("");
    setChatHistory([]);
    setTaskTraces([]);
    setLatestTaskId("");
    setLatestPlan(null);
    setLatestPlanTaskId("");
    setLatestPlanApprovalId("");
    setLatestPlanApprovals([]);
    setLatestPlanTraces([]);
    setLatestPlanMatches([]);
    setLatestPatchTaskId("");
    setLatestPatchApprovalId("");
    setLatestPatchApprovals([]);
    setLatestPatchArtifacts([]);
    setLatestPatchTraces([]);
    setLatestValidationTaskId("");
    setLatestValidationArtifacts([]);
    setLatestValidationTraces([]);
    setValidationTestCommand("");
    setActiveWorkflowPanel("idle");
  }, [selectedRepositoryId]);

  useEffect(() => {
    if (!selectedRepository) {
      return;
    }

    void loadRepositoryOverview(selectedRepository);
    void loadRepositoryMetadata(selectedRepository);
  }, [
    selectedRepository,
    repositoryIndexes,
    repositoryOverviewCache,
    repositoryMetadataCache,
  ]);

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <aside style={sidebarStyle}>
          <div style={brandCardStyle}>
            <div style={eyebrowStyle}>Developer Workspace</div>
            <h1 style={{ margin: "8px 0 0", fontSize: 30 }}>HILDA</h1>
            <p style={{ margin: "10px 0 0", color: "#4b5563", lineHeight: 1.6 }}>
              Human-in-the-loop development agents for grounded repo analysis,
              planning, patch review, and validation.
            </p>
          </div>

          <Card
            title="Workspaces"
            subtitle="Keep repository groups clean and easy to switch between."
          >
            <form
              onSubmit={handleCreateWorkspace}
              style={{ display: "grid", gap: 12, marginBottom: 16 }}
            >
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Workspace name"
                style={inputStyle}
              />
              <button
                type="submit"
                disabled={submittingWorkspace}
                style={buttonStyle}
              >
                {submittingWorkspace ? "Creating..." : "Create workspace"}
              </button>
            </form>

            {loadingWorkspaces ? (
              <p style={mutedTextStyle}>Loading workspaces...</p>
            ) : workspaces.length === 0 ? (
              <p style={mutedTextStyle}>No workspaces yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {workspaces.map((workspace) => {
                  const isSelected = workspace.id === selectedWorkspaceId;

                  return (
                    <button
                      key={workspace.id}
                      onClick={() => setSelectedWorkspaceId(workspace.id)}
                      style={{
                        ...sidebarButtonStyle,
                        border: isSelected
                          ? "1px solid #1d4ed8"
                          : "1px solid #2a3340",
                        background: isSelected ? "#18202b" : "#141922",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{workspace.name}</div>
                      <div style={{ ...mutedTextStyle, marginTop: 4 }}>
                        Created{" "}
                        {new Date(workspace.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card
            title="Repositories"
            subtitle={
              selectedWorkspace
                ? `Repos inside ${selectedWorkspace.name}`
                : "Select a workspace to view repositories"
            }
            action={
              selectedWorkspace ? (
                <button
                  onClick={() =>
                    void loadRepositories(selectedWorkspace.id, {
                      background: true,
                    })
                  }
                  style={secondaryButtonStyle}
                >
                  Refresh
                </button>
              ) : null
            }
          >
            {!selectedWorkspace ? (
              <p style={mutedTextStyle}>Choose a workspace first.</p>
            ) : loadingRepositories && repositories.length === 0 ? (
              <p style={mutedTextStyle}>Loading repositories...</p>
            ) : repositories.length === 0 ? (
              <p style={mutedTextStyle}>No repositories in this workspace yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {repositories.map((repository) => {
                  const index = repositoryIndexes[repository.id] ?? null;
                  const isSelected = repository.id === selectedRepositoryId;

                  return (
                    <article
                      key={repository.id}
                      style={{
                        ...sidebarButtonStyle,
                        border: isSelected
                          ? "1px solid #0f766e"
                          : "1px solid #2a3340",
                        background: isSelected ? "#162127" : "#141922",
                      }}
                    >
                      <button
                        onClick={() => setSelectedRepositoryId(repository.id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          width: "100%",
                          textAlign: "left",
                          color: "inherit",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>
                            {repository.name}
                          </div>
                          <StatusBadge status={repository.status} />
                        </div>
                        <div style={{ ...mutedTextStyle, marginTop: 6 }}>
                          {repository.provider === "local"
                            ? `Local directory • ${index?.status ?? "No index"}`
                            : `${repository.defaultBranch} • ${index?.status ?? "No index"}`}
                        </div>
                      </button>
                      <div style={{ marginTop: 10, display: "flex" }}>
                        <button
                          onClick={() => void handleDeleteRepository(repository)}
                          disabled={deletingRepositoryId === repository.id}
                          style={dangerButtonStyle}
                        >
                          {deletingRepositoryId === repository.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Card>

          <Card
            title="Add repository"
            subtitle="Connect another repo into the selected workspace."
          >
            <form
              onSubmit={handleCreateRepository}
              style={{ display: "grid", gap: 12 }}
            >
              <select
                value={repositoryForm.provider}
                onChange={(event) =>
                  setRepositoryForm((current) => ({
                    ...current,
                    provider: event.target.value as "github" | "local",
                  }))
                }
                style={inputStyle}
                disabled={!selectedWorkspace}
              >
                <option value="github">GitHub repository</option>
                <option value="local">Local directory</option>
              </select>
              <input
                value={repositoryForm.name}
                onChange={(event) =>
                  setRepositoryForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Repository name"
                style={inputStyle}
                disabled={!selectedWorkspace}
              />
              {repositoryForm.provider === "github" ? (
                <>
                  <input
                    value={repositoryForm.defaultBranch}
                    onChange={(event) =>
                      setRepositoryForm((current) => ({
                        ...current,
                        defaultBranch: event.target.value,
                      }))
                    }
                    placeholder="main"
                    style={inputStyle}
                    disabled={!selectedWorkspace}
                  />
                  <input
                    value={repositoryForm.cloneUrl}
                    onChange={(event) =>
                      setRepositoryForm((current) => ({
                        ...current,
                        cloneUrl: event.target.value,
                      }))
                    }
                    placeholder="https://github.com/org/repo.git"
                    style={inputStyle}
                    disabled={!selectedWorkspace}
                  />
                </>
              ) : (
                <input
                  value={repositoryForm.localPath}
                  onChange={(event) =>
                    setRepositoryForm((current) => ({
                      ...current,
                      localPath: event.target.value,
                    }))
                  }
                  placeholder="/absolute/path/to/local/repository"
                  style={inputStyle}
                  disabled={!selectedWorkspace}
                />
              )}
              <button
                type="submit"
                disabled={!selectedWorkspace || submittingRepository}
                style={buttonStyle}
              >
                {submittingRepository ? "Adding..." : "Add repository"}
              </button>
            </form>
          </Card>
        </aside>

        <section style={contentStyle}>
          {error ? (
            <div style={errorStyle}>{error}</div>
          ) : null}

          {!selectedWorkspace ? (
            <Card
              title="Start with a workspace"
              subtitle="Create a workspace in the left sidebar to begin organizing repositories."
            >
              <p style={mutedTextStyle}>
                HILDA works best when each workspace has a clean set of
                repositories and a clear developer context.
              </p>
            </Card>
          ) : !selectedRepository ? (
            <Card
              title="Select a repository"
              subtitle={`Choose the repo you want to work on inside ${selectedWorkspace.name}.`}
            >
              <p style={mutedTextStyle}>
                Once a repository is selected, HILDA will pre-load its overview
                and make chat, planning, and validation available in one place.
              </p>
            </Card>
          ) : (
            <>
              <section style={repoHeaderCardStyle}>
                <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
                  <div>
                    <div style={eyebrowStyle}>
                      {selectedWorkspace.name} / active repository
                    </div>
                    <div style={repoTitleRowStyle}>
                      <h2 style={{ margin: 0, fontSize: 30 }}>
                        {selectedRepository.name}
                      </h2>
                      <StatusBadge status={selectedRepository.status} />
                    </div>
                  </div>

                  <div style={repoMetaRowStyle}>
                    <span style={heroMetaPillStyle}>
                      {selectedRepository.provider === "github"
                        ? "GitHub repo"
                        : "Local directory"}
                    </span>
                    <span style={heroMetaPillStyle}>
                      Branch {selectedRepository.defaultBranch}
                    </span>
                    <span style={heroMetaPillStyle}>
                      Last indexed{" "}
                      {selectedRepositoryIndex?.indexedAt
                        ? new Date(
                            selectedRepositoryIndex.indexedAt,
                          ).toLocaleString()
                        : "not yet"}
                    </span>
                  </div>

                  <p style={repoDescriptionStyle}>
                    {extractRepositoryDescription(
                      selectedRepositoryOverview,
                      loadingOverviewRepositoryId === selectedRepository.id,
                    )}
                  </p>

                  <div style={repoChipRowStyle}>
                    {extractLanguageNames(selectedRepositoryOverview).map(
                      (language) => (
                        <span key={`language-${language}`} style={headerChipStyle}>
                          {language}
                        </span>
                      ),
                    )}

                    {getOverviewMetric(selectedRepositoryOverview, "Files scanned") ? (
                      <span style={headerChipStyle}>
                        {getOverviewMetric(
                          selectedRepositoryOverview,
                          "Files scanned",
                        )?.value} files
                      </span>
                    ) : null}

                    {extractToolingNames(selectedRepositoryOverview).map((tool) => (
                      <span key={`tool-${tool}`} style={headerChipStyle}>
                        {tool}
                      </span>
                    ))}

                    <span style={headerChipStyle}>
                      Issues{" "}
                      {formatIssueCount(
                        selectedRepository,
                        selectedRepositoryMetadata,
                        loadingRepositoryMetadataId === selectedRepository.id,
                      )}
                    </span>
                  </div>
                </div>

                <div style={repoHeaderActionsStyle}>
                  <button
                    onClick={() => void handleDeleteRepository(selectedRepository)}
                    disabled={deletingRepositoryId === selectedRepository.id}
                    style={dangerButtonStyle}
                  >
                    {deletingRepositoryId === selectedRepository.id
                      ? "Deleting..."
                      : "Delete repository"}
                  </button>
                  <button
                    onClick={() => {
                      setRepositoryOverviewCache((current) => {
                        const next = { ...current };
                        delete next[selectedRepository.id];
                        return next;
                      });
                      setRepositoryMetadataCache((current) => {
                        const next = { ...current };
                        delete next[selectedRepository.id];
                        return next;
                      });
                      void loadRepositoryOverview(selectedRepository);
                      void loadRepositoryMetadata(selectedRepository);
                    }}
                    disabled={selectedRepository.status !== "indexed"}
                    style={secondaryButtonStyle}
                  >
                    Refresh repo context
                  </button>
                </div>
              </section>

              <details style={detailsStyle}>
                <summary style={detailsSummaryStyle}>
                  Full repository overview
                </summary>
                <div style={detailsContentStyle}>
                  {selectedRepository.status !== "indexed" ? (
                    <p style={mutedTextStyle}>
                      This repository needs to finish indexing before HILDA can
                      build a useful overview.
                    </p>
                  ) : loadingOverviewRepositoryId === selectedRepository.id ? (
                    <p style={mutedTextStyle}>Building repository overview...</p>
                  ) : selectedRepositoryOverview ? (
                    <RepositoryOverviewPanel
                      overview={selectedRepositoryOverview}
                      summary={selectedRepositoryIndex?.summary ?? null}
                    />
                  ) : (
                    <p style={mutedTextStyle}>
                      Overview not loaded yet. HILDA will fetch it automatically.
                    </p>
                  )}
                </div>
              </details>

              <section style={workspaceCanvasStyle}>
                <div style={chatHistoryStyle}>
                  {chatHistory.length === 0 ? (
                    <div style={chatEmptyStateStyle}>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        Start a conversation with this repository
                      </div>
                      <div style={{ ...mutedTextStyle, maxWidth: 560 }}>
                        Ask HILDA to understand the codebase, locate an
                        implementation, debug a failure, or plan a change.
                      </div>
                    </div>
                  ) : (
                    <div style={chatTimelineStyle}>
                      {chatHistory.map((entry) => (
                        <article
                          key={entry.id}
                          style={
                            entry.role === "user"
                              ? userChatBubbleStyle
                              : assistantChatBubbleStyle
                          }
                        >
                          <div style={chatMetaStyle}>
                            {entry.role === "user" ? "You" : "HILDA"}
                            {entry.title ? ` • ${entry.title}` : ""}
                          </div>
                          <div style={{ lineHeight: 1.7 }}>{entry.body}</div>
                        </article>
                      ))}
                    </div>
                  )}

                  <WorkflowPanel
                    activeWorkflowPanel={activeWorkflowPanel}
                    questionAnswer={questionAnswer}
                    questionMatches={questionMatches}
                    latestTaskId={latestTaskId}
                    taskTraces={taskTraces}
                    latestPlan={latestPlan}
                    latestPlanApprovals={latestPlanApprovals}
                    latestPlanMatches={latestPlanMatches}
                    latestPlanTaskId={latestPlanTaskId}
                    latestPlanTraces={latestPlanTraces}
                    latestPatchArtifacts={latestPatchArtifacts}
                    latestPatchApprovals={latestPatchApprovals}
                    latestPatchTraces={latestPatchTraces}
                    latestValidationArtifacts={latestValidationArtifacts}
                    latestValidationTaskId={latestValidationTaskId}
                    latestValidationTraces={latestValidationTraces}
                    mutedTextStyle={mutedTextStyle}
                    onApprovePlan={() => void handlePlanApproval("approved")}
                    onRejectPlan={() => void handlePlanApproval("rejected")}
                    onCreatePatch={() => void handleCreatePatch()}
                    onApprovePatch={() => void handlePatchApproval("approved")}
                    onRejectPatch={() => void handlePatchApproval("rejected")}
                    onRunValidation={() => void handleRunValidation()}
                    creatingPatch={creatingPatch}
                    runningValidation={runningValidation}
                    latestPatchTaskId={latestPatchTaskId}
                    validationTestCommand={validationTestCommand}
                    setValidationTestCommand={setValidationTestCommand}
                  />
                </div>

                <form onSubmit={handleAskQuestion} style={composerShellStyle}>
                  <div style={quickChipRowStyle}>
                    <button
                      type="button"
                      style={quickChipStyle}
                      onClick={() =>
                        setQuestion("What is this repo and how is it structured?")
                      }
                    >
                      Understand repo
                    </button>
                    <button
                      type="button"
                      style={quickChipStyle}
                      onClick={() =>
                        setQuestion("Where is authentication implemented?")
                      }
                    >
                      Find implementation
                    </button>
                    <button
                      type="button"
                      style={quickChipStyle}
                      onClick={() =>
                        setQuestion("Why is this failing? Help me debug the issue.")
                      }
                    >
                      Debug issue
                    </button>
                    <button
                      type="button"
                      style={quickChipStyle}
                      onClick={() =>
                        setQuestion("How would we add a new feature here?")
                      }
                    >
                      Plan feature
                    </button>
                  </div>

                  <div style={composerRowStyle}>
                    <textarea
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="Ask about the repo, debug a failure, plan a feature, or request a change"
                      style={composerTextareaStyle}
                      disabled={selectedRepository.status !== "indexed"}
                      rows={3}
                    />
                    <button
                      type="submit"
                      disabled={
                        selectedRepository.status !== "indexed" || askingQuestion
                      }
                      style={composerSendButtonStyle}
                    >
                      {askingQuestion ? "Working..." : "Send"}
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function getOverviewSection(
  overview: AnalysisResult | null,
  title: string,
) {
  return overview?.sections?.find((section) => section.title === title) ?? null;
}

function getOverviewMetric(
  overview: AnalysisResult | null,
  label: string,
) {
  return overview?.metrics?.find((metric) => metric.label === label) ?? null;
}

function extractDetectedItems(line: string): string[] {
  const [, value] = line.split(":");
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractLanguageNames(overview: AnalysisResult | null): string[] {
  const section = getOverviewSection(overview, "Languages");

  if (!section) {
    return [];
  }

  return section.items
    .map((item) => item.split(":")[0]?.trim())
    .filter(Boolean)
    .slice(0, 4) as string[];
}

function extractToolingNames(overview: AnalysisResult | null): string[] {
  const section = getOverviewSection(overview, "Frameworks and tooling");
  const detectedLine = section?.items.find((item) => item.startsWith("Detected:"));

  return detectedLine ? extractDetectedItems(detectedLine).slice(0, 4) : [];
}

function extractRepositoryDescription(
  overview: AnalysisResult | null,
  isLoading: boolean,
): string {
  const purpose = getOverviewSection(overview, "Purpose")?.items[0];

  if (purpose) {
    return purpose;
  }

  if (isLoading) {
    return "Building a repository summary from package manifests, code structure, and repo signals...";
  }

  return "No repository summary yet. HILDA will fill this in as soon as indexing and overview generation are complete.";
}

function formatIssueCount(
  repository: Repository,
  metadata: RepositoryMetadata | null,
  isLoading: boolean,
): string {
  if (repository.provider !== "github") {
    return "local";
  }

  if (isLoading) {
    return "loading";
  }

  return metadata?.githubIssuesOpen != null
    ? String(metadata.githubIssuesOpen)
    : "n/a";
}

function WorkflowPanel({
  activeWorkflowPanel,
  questionAnswer,
  questionMatches,
  latestTaskId,
  taskTraces,
  latestPlan,
  latestPlanApprovals,
  latestPlanMatches,
  latestPlanTaskId,
  latestPlanTraces,
  latestPatchArtifacts,
  latestPatchApprovals,
  latestPatchTraces,
  latestValidationArtifacts,
  latestValidationTaskId,
  latestValidationTraces,
  mutedTextStyle,
  onApprovePlan,
  onRejectPlan,
  onCreatePatch,
  onApprovePatch,
  onRejectPatch,
  onRunValidation,
  creatingPatch,
  runningValidation,
  latestPatchTaskId,
  validationTestCommand,
  setValidationTestCommand,
}: {
  activeWorkflowPanel: "idle" | "question" | "plan" | "patch" | "validation";
  questionAnswer: string;
  questionMatches: QuestionMatch[];
  latestTaskId: string;
  taskTraces: TaskTrace[];
  latestPlan: GeneratedPlan | null;
  latestPlanApprovals: ApprovalRequest[];
  latestPlanMatches: QuestionMatch[];
  latestPlanTaskId: string;
  latestPlanTraces: TaskTrace[];
  latestPatchArtifacts: PatchArtifact[];
  latestPatchApprovals: ApprovalRequest[];
  latestPatchTraces: TaskTrace[];
  latestValidationArtifacts: PatchArtifact[];
  latestValidationTaskId: string;
  latestValidationTraces: TaskTrace[];
  mutedTextStyle: React.CSSProperties;
  onApprovePlan: () => void;
  onRejectPlan: () => void;
  onCreatePatch: () => void;
  onApprovePatch: () => void;
  onRejectPatch: () => void;
  onRunValidation: () => void;
  creatingPatch: boolean;
  runningValidation: boolean;
  latestPatchTaskId: string;
  validationTestCommand: string;
  setValidationTestCommand: React.Dispatch<React.SetStateAction<string>>;
}) {
  if (
    activeWorkflowPanel === "idle" &&
    !questionAnswer &&
    !latestPlan &&
    latestPatchArtifacts.length === 0 &&
    latestValidationArtifacts.length === 0
  ) {
    return null;
  }

  const planApproved = latestPlanApprovals.some(
    (approval) => approval.status === "approved",
  );
  const patchApproved = latestPatchApprovals.some(
    (approval) => approval.status === "approved",
  );

  return (
    <div style={workflowDockStyle}>
      {activeWorkflowPanel === "question" ? (
        <details style={detailsStyle} open>
          <summary style={detailsSummaryStyle}>Latest answer</summary>
          <div style={detailsContentStyle}>
            {questionAnswer ? (
              <div style={summaryPanelStyle}>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                  {questionAnswer}
                </div>
              </div>
            ) : null}

            {questionMatches.length > 0 ? (
              <details style={detailsStyle}>
                <summary style={detailsSummaryStyle}>
                  Evidence and citations
                </summary>
                <div style={detailsContentStyle}>
                  <MatchList
                    title="Grounding retrieved for this answer"
                    matches={questionMatches}
                  />
                </div>
              </details>
            ) : null}

            {taskTraces.length > 0 ? (
              <details style={detailsStyle}>
                <summary style={detailsSummaryStyle}>
                  Trace {latestTaskId ? `• ${latestTaskId}` : ""}
                </summary>
                <div style={detailsContentStyle}>
                  <TraceList title="Task trace" traces={taskTraces} />
                </div>
              </details>
            ) : null}
          </div>
        </details>
      ) : null}

      {latestPlan ? (
        <details style={detailsStyle} open={activeWorkflowPanel === "plan"}>
          <summary style={detailsSummaryStyle}>Plan review</summary>
          <div style={detailsContentStyle}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={summaryPanelStyle}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {latestPlan.summary}
                </div>
                <div style={mutedTextStyle}>
                  Task {latestPlanTaskId || "not available yet"}
                </div>
              </div>

              {latestPlan.assumptions.length > 0 ? (
                <PlanSection
                  title="Assumptions"
                  items={latestPlan.assumptions}
                  mutedTextStyle={mutedTextStyle}
                />
              ) : null}
              {latestPlan.impactedFiles.length > 0 ? (
                <PlanSection
                  title="Impacted files"
                  items={latestPlan.impactedFiles}
                  mutedTextStyle={mutedTextStyle}
                />
              ) : null}
              {latestPlan.steps.length > 0 ? (
                <PlanSection
                  title="Implementation steps"
                  items={latestPlan.steps}
                  mutedTextStyle={mutedTextStyle}
                />
              ) : null}
              {latestPlan.risks.length > 0 ? (
                <PlanSection
                  title="Risks"
                  items={latestPlan.risks}
                  mutedTextStyle={mutedTextStyle}
                />
              ) : null}
              {latestPlan.validation.length > 0 ? (
                <PlanSection
                  title="Validation"
                  items={latestPlan.validation}
                  mutedTextStyle={mutedTextStyle}
                />
              ) : null}

              <div style={actionRowStyle}>
                <button style={buttonStyle} onClick={onApprovePlan}>
                  Approve plan
                </button>
                <button style={dangerButtonStyle} onClick={onRejectPlan}>
                  Reject plan
                </button>
                <button
                  style={secondaryButtonStyle}
                  onClick={onCreatePatch}
                  disabled={!planApproved || creatingPatch}
                >
                  {creatingPatch ? "Generating diff..." : "Create diff"}
                </button>
              </div>

              {latestPlanApprovals.length > 0 ? (
                <details style={detailsStyle}>
                  <summary style={detailsSummaryStyle}>Approval history</summary>
                  <div style={detailsContentStyle}>
                    <ApprovalList approvals={latestPlanApprovals} />
                  </div>
                </details>
              ) : null}

              {latestPlanMatches.length > 0 ? (
                <details style={detailsStyle}>
                  <summary style={detailsSummaryStyle}>Plan evidence</summary>
                  <div style={detailsContentStyle}>
                    <MatchList
                      title="Evidence used for planning"
                      matches={latestPlanMatches}
                    />
                  </div>
                </details>
              ) : null}

              {latestPlanTraces.length > 0 ? (
                <details style={detailsStyle}>
                  <summary style={detailsSummaryStyle}>Plan trace</summary>
                  <div style={detailsContentStyle}>
                    <TraceList title="Task trace" traces={latestPlanTraces} />
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        </details>
      ) : null}

      {latestPatchArtifacts.length > 0 ? (
        <details style={detailsStyle} open={activeWorkflowPanel === "patch"}>
          <summary style={detailsSummaryStyle}>Diff review</summary>
          <div style={detailsContentStyle}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={actionRowStyle}>
                <button style={buttonStyle} onClick={onApprovePatch}>
                  Approve diff
                </button>
                <button style={dangerButtonStyle} onClick={onRejectPatch}>
                  Reject diff
                </button>
                <button
                  style={secondaryButtonStyle}
                  onClick={onRunValidation}
                  disabled={!patchApproved || runningValidation}
                >
                  {runningValidation ? "Running validation..." : "Run validation"}
                </button>
              </div>

              <ArtifactList title="Patch artifact" artifacts={latestPatchArtifacts} />

              {latestPatchApprovals.length > 0 ? (
                <details style={detailsStyle}>
                  <summary style={detailsSummaryStyle}>Approval history</summary>
                  <div style={detailsContentStyle}>
                    <ApprovalList approvals={latestPatchApprovals} />
                  </div>
                </details>
              ) : null}

              {latestPatchTraces.length > 0 ? (
                <details style={detailsStyle}>
                  <summary style={detailsSummaryStyle}>
                    Patch trace {latestPatchTaskId ? `• ${latestPatchTaskId}` : ""}
                  </summary>
                  <div style={detailsContentStyle}>
                    <TraceList title="Task trace" traces={latestPatchTraces} />
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        </details>
      ) : null}

      {latestPatchTaskId ? (
        <details
          style={detailsStyle}
          open={activeWorkflowPanel === "validation"}
        >
          <summary style={detailsSummaryStyle}>Validation</summary>
          <div style={detailsContentStyle}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={validationComposerStyle}>
                <input
                  value={validationTestCommand}
                  onChange={(event) =>
                    setValidationTestCommand(event.target.value)
                  }
                  placeholder="Optional test command, for example pnpm test -- --runInBand"
                  style={inputStyle}
                />
                <button
                  style={secondaryButtonStyle}
                  onClick={onRunValidation}
                  disabled={runningValidation}
                >
                  {runningValidation ? "Running..." : "Run"}
                </button>
              </div>

              {latestValidationArtifacts.length > 0 ? (
                <ArtifactList
                  title="Validation report"
                  artifacts={latestValidationArtifacts}
                />
              ) : (
                <div style={mutedTextStyle}>
                  No validation run yet for this diff.
                </div>
              )}

              {latestValidationTraces.length > 0 ? (
                <details style={detailsStyle}>
                  <summary style={detailsSummaryStyle}>
                    Validation trace{" "}
                    {latestValidationTaskId ? `• ${latestValidationTaskId}` : ""}
                  </summary>
                  <div style={detailsContentStyle}>
                    <TraceList
                      title="Task trace"
                      traces={latestValidationTraces}
                    />
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function RepositoryOverviewPanel({
  overview,
  summary,
}: {
  overview: AnalysisResult;
  summary: string | null;
}) {
  const sections = overview.sections ?? [];
  const purposeSection = sections.find((section) => section.title === "Purpose");
  const architectureSection = sections.find(
    (section) => section.title === "Architecture",
  );
  const toolingSection = sections.find(
    (section) => section.title === "Frameworks and tooling",
  );
  const testingSection = sections.find(
    (section) => section.title === "Testing and coverage",
  );
  const issuesSection = sections.find(
    (section) => section.title === "Observed gaps and issues",
  );
  const milestonesSection = sections.find(
    (section) => section.title === "Suggested milestones",
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={overviewSummaryCardStyle}>
        <div>
          <div style={overviewEyebrowStyle}>Repo snapshot</div>
          <strong style={{ fontSize: 18 }}>{overview.title}</strong>
        </div>
        <div style={{ marginTop: 10, lineHeight: 1.7 }}>{overview.answer}</div>
        {purposeSection?.items[0] ? (
          <div style={overviewPurposeStyle}>{purposeSection.items[0]}</div>
        ) : null}
      </div>

      {overview.metrics && overview.metrics.length > 0 ? (
        <div style={metricGridStyle}>
          {overview.metrics.map((metric) => (
            <article key={`${metric.label}-${metric.value}`} style={metricCardStyle}>
              <div style={{ ...mutedTextStyle, marginBottom: 4 }}>
                {metric.label}
              </div>
              <div style={{ fontWeight: 700 }}>{metric.value}</div>
            </article>
          ))}
        </div>
      ) : null}

      <div style={compactOverviewGridStyle}>
        {architectureSection?.items.length ? (
          <article style={sectionCardStyle}>
            <div style={compactSectionTitleStyle}>Architecture</div>
            <div style={{ display: "grid", gap: 6 }}>
              {architectureSection.items.slice(0, 2).map((item, index) => (
                <div
                  key={`architecture-${index}-${item}`}
                  style={sectionItemStyle}
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {toolingSection?.items.length ? (
          <article style={sectionCardStyle}>
            <div style={compactSectionTitleStyle}>Tooling</div>
            <div style={{ display: "grid", gap: 6 }}>
              {toolingSection.items.slice(0, 2).map((item, index) => (
                <div key={`tooling-${index}-${item}`} style={sectionItemStyle}>
                  {item}
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {testingSection?.items.length ? (
          <article style={sectionCardStyle}>
            <div style={compactSectionTitleStyle}>Testing</div>
            <div style={{ display: "grid", gap: 6 }}>
              {testingSection.items.slice(0, 2).map((item, index) => (
                <div key={`testing-${index}-${item}`} style={sectionItemStyle}>
                  {item}
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </div>

      <div style={compactOverviewGridStyle}>
        {issuesSection?.items.length ? (
          <article style={sectionCardStyle}>
            <div style={compactSectionTitleStyle}>Top gaps</div>
            <div style={{ display: "grid", gap: 6 }}>
              {issuesSection.items.slice(0, 3).map((item, index) => (
                <div key={`issue-${index}-${item}`} style={sectionItemStyle}>
                  {item}
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {milestonesSection?.items.length ? (
          <article style={sectionCardStyle}>
            <div style={compactSectionTitleStyle}>Suggested next steps</div>
            <div style={{ display: "grid", gap: 6 }}>
              {milestonesSection.items.slice(0, 3).map((item, index) => (
                <div
                  key={`milestone-${index}-${item}`}
                  style={sectionItemStyle}
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </div>

      {sections.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          <details style={detailsStyle}>
            <summary style={detailsSummaryStyle}>Full repository overview</summary>
            <div style={detailsContentStyle}>
              <div style={{ display: "grid", gap: 10 }}>
                {sections.map((section) => (
                  <article key={section.title} style={sectionCardStyle}>
                    <div style={compactSectionTitleStyle}>{section.title}</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {section.items.map((item, index) => (
                        <div
                          key={`${section.title}-${index}-${item}`}
                          style={sectionItemStyle}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </details>

          {overview.evidence.length > 0 ? (
            <details style={detailsStyle}>
              <summary style={detailsSummaryStyle}>Evidence signals</summary>
              <div style={detailsContentStyle}>
                <div style={{ display: "grid", gap: 8 }}>
                  {overview.evidence.map((item, index) => (
                    <article
                      key={`${item.label}-${item.value}-${index}`}
                      style={sectionCardStyle}
                    >
                      <div style={{ ...mutedTextStyle, marginBottom: 4 }}>
                        {item.label}
                      </div>
                      <div style={sectionItemStyle}>{item.value}</div>
                    </article>
                  ))}
                </div>
              </div>
            </details>
          ) : null}

          {summary ? (
            <details style={detailsStyle}>
              <summary style={detailsSummaryStyle}>Index summary</summary>
              <div style={detailsContentStyle}>
                <div style={summaryPanelStyle}>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                      color: "#d6dbe3",
                    }}
                  >
                    {summary}
                  </div>
                </div>
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MatchList({
  title,
  matches,
}: {
  title: string;
  matches: QuestionMatch[];
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={mutedTextStyle}>{title}</div>
      {matches.map((match) => (
        <article key={match.chunkId} style={resultCardStyle}>
          <div style={resultHeaderStyle}>
            <strong>{match.path}</strong>
            <span style={mutedTextStyle}>
              lines {match.lineStart}-{match.lineEnd} • score {match.score}
            </span>
          </div>
          {match.reasons.length > 0 ? (
            <div style={reasonListStyle}>
              {match.reasons.map((reason) => (
                <span key={`${match.chunkId}-${reason}`} style={reasonPillStyle}>
                  {reason}
                </span>
              ))}
            </div>
          ) : null}
          <div style={snippetStyle}>{match.snippet}</div>
        </article>
      ))}
    </div>
  );
}

function TraceList({
  title,
  traces,
}: {
  title: string;
  traces: TaskTrace[];
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={mutedTextStyle}>{title}</div>
      {traces.map((trace) => (
        <article key={trace.id} style={traceCardStyle}>
          <div style={{ fontWeight: 700 }}>{trace.eventType}</div>
          <div style={{ ...mutedTextStyle, marginTop: 4 }}>
            {new Date(trace.createdAt).toLocaleString()}
          </div>
          <pre style={tracePreStyle}>
            {JSON.stringify(trace.eventDataJson, null, 2)}
          </pre>
        </article>
      ))}
    </div>
  );
}

function ApprovalList({ approvals }: { approvals: ApprovalRequest[] }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={mutedTextStyle}>Approval history</div>
      {approvals.map((approval) => (
        <article key={approval.id} style={approvalCardStyle}>
          <div>{approval.summary}</div>
          <StatusBadge status={approval.status} />
        </article>
      ))}
    </div>
  );
}

function ArtifactList({
  title,
  artifacts,
}: {
  title: string;
  artifacts: PatchArtifact[];
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={mutedTextStyle}>{title}</div>
      {artifacts.map((artifact) => (
        <article key={artifact.id} style={resultCardStyle}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{artifact.title}</div>
          <pre style={artifactPreStyle}>{artifact.content}</pre>
        </article>
      ))}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0f1115",
  color: "#e5e7eb",
  fontFamily:
    '"IBM Plex Sans", "Avenir Next", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
};

const shellStyle: React.CSSProperties = {
  maxWidth: 1480,
  margin: "0 auto",
  padding: "24px 20px 40px",
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: 24,
  alignItems: "start",
};

const sidebarStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
  position: "sticky",
  top: 20,
};

const contentStyle: React.CSSProperties = {
  display: "grid",
  gap: 20,
};

const brandCardStyle: React.CSSProperties = {
  borderRadius: 24,
  padding: 24,
  background: "#171a21",
  color: "#f3f4f6",
  border: "1px solid #262b36",
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.22)",
};

const repoHeaderCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "flex-start",
  borderRadius: 24,
  padding: 24,
  background: "#171a21",
  color: "#f3f4f6",
  border: "1px solid #262b36",
  boxShadow: "0 12px 28px rgba(0, 0, 0, 0.2)",
};

const eyebrowStyle: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 11,
  fontWeight: 700,
  color: "#7c8aa0",
};

const sidebarButtonStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 14,
  borderRadius: 16,
  cursor: "pointer",
  transition: "transform 120ms ease, box-shadow 120ms ease",
  color: "#e5e7eb",
  boxShadow: "0 6px 16px rgba(0, 0, 0, 0.12)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #2b3340",
  background: "#11151c",
  color: "#e5e7eb",
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  background: "#2b3545",
  color: "#f3f4f6",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #2b3340",
  borderRadius: 12,
  padding: "10px 14px",
  background: "#141922",
  color: "#dbe4ee",
  fontWeight: 600,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "1px solid #4c242b",
  borderRadius: 12,
  padding: "10px 14px",
  background: "#241418",
  color: "#fca5a5",
  fontWeight: 600,
  cursor: "pointer",
};

const mutedTextStyle: React.CSSProperties = {
  color: "#8b98aa",
  fontSize: 14,
};

const errorStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "#2a1518",
  color: "#fca5a5",
  border: "1px solid #5a232a",
};

const repoTitleRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  marginTop: 8,
};

const repoMetaRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const heroMetaPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  border: "1px solid #2a3340",
  background: "#11161d",
  color: "#c8d1dd",
  padding: "8px 12px",
  fontSize: 13,
};

const repoDescriptionStyle: React.CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  lineHeight: 1.7,
  maxWidth: 960,
};

const repoChipRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const headerChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  background: "#10151c",
  border: "1px solid #29313d",
  color: "#d6dbe3",
  padding: "7px 11px",
  fontSize: 12,
  fontWeight: 600,
};

const repoHeaderActionsStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  justifyItems: "end",
  minWidth: 180,
};

const workspaceCanvasStyle: React.CSSProperties = {
  minHeight: "68vh",
  border: "1px solid #262f3c",
  borderRadius: 24,
  background: "#141922",
  boxShadow: "0 12px 28px rgba(0,0,0,0.16)",
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr) auto",
  overflow: "hidden",
};

const chatHistoryStyle: React.CSSProperties = {
  padding: "28px 28px 16px",
  minHeight: 480,
  display: "grid",
  alignContent: "start",
  gap: 18,
  overflowY: "auto",
};

const chatEmptyStateStyle: React.CSSProperties = {
  minHeight: 420,
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  gap: 10,
  color: "#d6dbe3",
};

const chatTimelineStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
  alignContent: "start",
};

const userChatBubbleStyle: React.CSSProperties = {
  justifySelf: "end",
  width: "min(760px, 100%)",
  borderRadius: 20,
  padding: "16px 18px",
  background: "#1b2330",
  border: "1px solid #324156",
  color: "#eff6ff",
};

const assistantChatBubbleStyle: React.CSSProperties = {
  justifySelf: "start",
  width: "min(880px, 100%)",
  borderRadius: 20,
  padding: "16px 18px",
  background: "#10151c",
  border: "1px solid #263140",
  color: "#e5e7eb",
};

const chatMetaStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#8b98aa",
  marginBottom: 8,
};

const workflowDockStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  alignContent: "start",
};

const composerShellStyle: React.CSSProperties = {
  borderTop: "1px solid #262f3c",
  background: "#11161d",
  padding: 20,
  display: "grid",
  gap: 14,
};

const quickChipRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const quickChipStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 13,
};

const composerRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 14,
  alignItems: "end",
};

const composerTextareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 92,
  resize: "vertical",
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid #2b3340",
  background: "#0f141b",
  color: "#e5e7eb",
  fontSize: 15,
  lineHeight: 1.6,
};

const composerSendButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  minWidth: 120,
  minHeight: 52,
};

const actionRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const validationComposerStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "center",
};

const summaryPanelStyle: React.CSSProperties = {
  background: "#131820",
  border: "1px solid #262f3c",
  borderRadius: 14,
  padding: 14,
};

const overviewSummaryCardStyle: React.CSSProperties = {
  border: "1px solid #263140",
  borderRadius: 16,
  padding: 16,
  background: "#151a22",
};

const overviewEyebrowStyle: React.CSSProperties = {
  ...eyebrowStyle,
  color: "#8b98aa",
  marginBottom: 4,
};

const overviewPurposeStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "#10151c",
  border: "1px solid #232c38",
  color: "#d6dbe3",
  lineHeight: 1.6,
};

const detailsStyle: React.CSSProperties = {
  border: "1px solid #262f3c",
  borderRadius: 14,
  background: "#11161d",
  overflow: "hidden",
};

const detailsSummaryStyle: React.CSSProperties = {
  cursor: "pointer",
  padding: 14,
  fontWeight: 700,
  color: "#d6dbe3",
  listStyle: "none",
};

const detailsContentStyle: React.CSSProperties = {
  padding: "0 14px 14px",
};

const metricGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

const metricCardStyle: React.CSSProperties = {
  border: "1px solid #263140",
  borderRadius: 14,
  padding: 12,
  background: "#131820",
};

const compactOverviewGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 10,
};

const compactSectionTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  marginBottom: 8,
  color: "#e5e7eb",
};

const sectionCardStyle: React.CSSProperties = {
  border: "1px solid #262f3c",
  borderRadius: 14,
  padding: 14,
  background: "#11161d",
};

const sectionItemStyle: React.CSSProperties = {
  lineHeight: 1.6,
  color: "#d6dbe3",
};

const resultCardStyle: React.CSSProperties = {
  border: "1px solid #262f3c",
  borderRadius: 14,
  padding: 14,
  background: "#11161d",
};

const resultHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 8,
  alignItems: "flex-start",
};

const reasonListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 8,
};

const reasonPillStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#b6c3d6",
  background: "#18202b",
  border: "1px solid #2e3a4a",
  borderRadius: 999,
  padding: "4px 8px",
};

const snippetStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  lineHeight: 1.5,
  color: "#d6dbe3",
  background: "#0f141b",
  border: "1px solid #232c38",
  borderRadius: 12,
  padding: 12,
};

const traceCardStyle: React.CSSProperties = {
  border: "1px solid #262f3c",
  borderRadius: 12,
  padding: 12,
  background: "#11161d",
};

const tracePreStyle: React.CSSProperties = {
  margin: "8px 0 0",
  whiteSpace: "pre-wrap",
  fontSize: 12,
  color: "#b9c3cf",
};

const approvalCardStyle: React.CSSProperties = {
  border: "1px solid #262f3c",
  borderRadius: 12,
  padding: 12,
  background: "#11161d",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
};

const artifactPreStyle: React.CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  fontSize: 12,
  lineHeight: 1.5,
  color: "#b9c3cf",
  background: "#0f141b",
  border: "1px solid #232c38",
  borderRadius: 12,
  padding: 12,
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
