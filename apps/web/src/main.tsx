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
  createPlan,
  createRepository,
  createValidation,
  createWorkspace,
  GeneratedPlan,
  getRepositoryIndexStatus,
  getTask,
  listRepositories,
  listWorkspaces,
  PatchArtifact,
  TaskTrace,
  updateApprovalRequest,
  updatePatchApprovalRequest,
  type QuestionMatch,
  type Repository,
  type RepositoryIndex,
  type Workspace,
} from "./lib/api";

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
  const [overviewTaskByRepositoryId, setOverviewTaskByRepositoryId] = useState<
    Record<string, string>
  >({});
  const [loadingOverviewRepositoryId, setLoadingOverviewRepositoryId] =
    useState("");
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingRepositories, setLoadingRepositories] = useState(false);
  const [refreshingRepositories, setRefreshingRepositories] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [repositoryForm, setRepositoryForm] = useState({
    name: "",
    defaultBranch: "main",
    cloneUrl: "",
  });
  const [submittingWorkspace, setSubmittingWorkspace] = useState(false);
  const [submittingRepository, setSubmittingRepository] = useState(false);
  const [error, setError] = useState("");
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
  const [question, setQuestion] = useState("");
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [questionMatches, setQuestionMatches] = useState<QuestionMatch[]>([]);
  const [questionRepositoryName, setQuestionRepositoryName] = useState("");
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [latestTaskId, setLatestTaskId] = useState("");
  const [taskTraces, setTaskTraces] = useState<TaskTrace[]>([]);
  const [planPrompt, setPlanPrompt] = useState("");
  const [creatingPlan, setCreatingPlan] = useState(false);
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

    if (background) {
      setRefreshingRepositories(true);
    } else {
      setLoadingRepositories(true);
    }

    setError("");

    try {
      const response = await listRepositories(workspaceId);
      setRepositories(response.repositories);

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

      setRepositoryIndexes(Object.fromEntries(indexEntries));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load repositories",
      );
    } finally {
      if (background) {
        setRefreshingRepositories(false);
      } else {
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
        setOverviewTaskByRepositoryId((current) => ({
          ...current,
          [repository.id]: response.taskId,
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

  async function handleAskQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRepositoryId || !question.trim()) {
      return;
    }

    setAskingQuestion(true);
    setError("");
    setQuestionMatches([]);
    setQuestionAnswer("");
    setTaskTraces([]);

    try {
      const response = await askRepository({
        repositoryId: selectedRepositoryId,
        prompt: question.trim(),
      });

      if (response.route === "repo_analysis") {
        setRepositoryOverviewCache((current) => ({
          ...current,
          [selectedRepositoryId]: response.result,
        }));
        setOverviewTaskByRepositoryId((current) => ({
          ...current,
          [selectedRepositoryId]: response.taskId,
        }));
        setQuestionRepositoryName(response.repository.name);
        setQuestionAnswer(
          "Updated the repository overview for this repo. Scroll up to the overview panel to review the latest summary.",
        );
        setQuestionMatches([]);
        setLatestTaskId(response.taskId);
      } else {
        setQuestionMatches(response.matches);
        setQuestionRepositoryName(response.repository.name);
        setQuestionAnswer(response.answer);
        setLatestTaskId(response.taskId);
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

  async function handleCreatePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRepositoryId || !planPrompt.trim()) {
      return;
    }

    setCreatingPlan(true);
    setError("");

    try {
      const response = await createPlan({
        repositoryId: selectedRepositoryId,
        prompt: planPrompt.trim(),
      });

      setLatestPlan(response.plan);
      setLatestPlanTaskId(response.taskId);
      setLatestPlanApprovalId(response.approvalRequestId);
      setLatestPlanMatches(response.matches);

      const taskResponse = await getTask(response.taskId);
      setLatestPlanTraces(taskResponse.traces);
      setLatestPlanApprovals(taskResponse.approvals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setCreatingPlan(false);
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
        provider: "github",
        name: repositoryForm.name.trim(),
        defaultBranch: repositoryForm.defaultBranch.trim() || "main",
        cloneUrl: repositoryForm.cloneUrl.trim() || null,
      });

      setRepositoryForm({
        name: "",
        defaultBranch: "main",
        cloneUrl: "",
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

    const interval = window.setInterval(() => {
      void loadRepositories(selectedWorkspaceId, { background: true });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [selectedWorkspaceId]);

  useEffect(() => {
    setQuestion("");
    setQuestionMatches([]);
    setQuestionAnswer("");
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
  }, [selectedRepositoryId]);

  useEffect(() => {
    if (!selectedRepository) {
      return;
    }

    void loadRepositoryOverview(selectedRepository);
  }, [selectedRepository, repositoryIndexes, repositoryOverviewCache]);

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
                {refreshingRepositories ? (
                  <div style={mutedTextStyle}>Refreshing repository statuses...</div>
                ) : null}
                {repositories.map((repository) => {
                  const index = repositoryIndexes[repository.id] ?? null;
                  const isSelected = repository.id === selectedRepositoryId;

                  return (
                    <button
                      key={repository.id}
                      onClick={() => setSelectedRepositoryId(repository.id)}
                      style={{
                        ...sidebarButtonStyle,
                        border: isSelected
                          ? "1px solid #0f766e"
                          : "1px solid #2a3340",
                        background: isSelected ? "#162127" : "#141922",
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
                        <div style={{ fontWeight: 700 }}>{repository.name}</div>
                        <StatusBadge status={repository.status} />
                      </div>
                      <div style={{ ...mutedTextStyle, marginTop: 6 }}>
                        {repository.defaultBranch} • {index?.status ?? "No index"}
                      </div>
                    </button>
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
              <section style={heroStyle}>
                <div>
                  <div style={eyebrowStyle}>
                    {selectedWorkspace.name} / Active repository
                  </div>
                  <h2 style={{ margin: "8px 0 0", fontSize: 32 }}>
                    {selectedRepository.name}
                  </h2>
                  <p style={{ margin: "10px 0 0", color: "#94a3b8" }}>
                    Branch {selectedRepository.defaultBranch}
                    {selectedRepository.cloneUrl
                      ? ` • ${selectedRepository.cloneUrl}`
                      : ""}
                  </p>
                </div>
                <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
                  <StatusBadge status={selectedRepository.status} />
                  <div style={heroMetaStyle}>
                    Indexed{" "}
                    {selectedRepositoryIndex?.indexedAt
                      ? new Date(
                          selectedRepositoryIndex.indexedAt,
                        ).toLocaleString()
                      : "not yet"}
                  </div>
                  <div style={heroMetaStyle}>
                    Overview{" "}
                    {selectedRepositoryOverview
                      ? "ready"
                      : loadingOverviewRepositoryId === selectedRepository.id
                        ? "loading"
                        : "pending"}
                  </div>
                </div>
              </section>

              <Card
                title="Repository overview"
                subtitle="Preloaded context for the selected repository."
                action={
                  selectedRepository.status === "indexed" ? (
                    <button
                      onClick={() => {
                        setRepositoryOverviewCache((current) => {
                          const next = { ...current };
                          delete next[selectedRepository.id];
                          return next;
                        });
                        void loadRepositoryOverview(selectedRepository);
                      }}
                      style={secondaryButtonStyle}
                    >
                      Refresh overview
                    </button>
                  ) : null
                }
              >
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
              </Card>

              <div style={twoColumnLayoutStyle}>
                <Card
                  title="Developer chat"
                  subtitle="Ask grounded questions about the active repository."
                >
                  <form
                    onSubmit={handleAskQuestion}
                    style={{ display: "grid", gap: 12, marginBottom: 16 }}
                  >
                    <input
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="Where is repository overview implemented?"
                      style={inputStyle}
                      disabled={selectedRepository.status !== "indexed"}
                    />
                    <button
                      type="submit"
                      disabled={
                        selectedRepository.status !== "indexed" || askingQuestion
                      }
                      style={buttonStyle}
                    >
                      {askingQuestion ? "Searching..." : "Ask HILDA"}
                    </button>
                  </form>

                  {questionAnswer ? (
                    <div style={highlightPanelStyle}>{questionAnswer}</div>
                  ) : (
                    <p style={mutedTextStyle}>
                      Ask implementation, debugging, or architecture questions
                      once the repository is indexed.
                    </p>
                  )}

                  {questionMatches.length > 0 ? (
                    <MatchList
                      title={`Evidence from ${questionRepositoryName}`}
                      matches={questionMatches}
                    />
                  ) : null}

                  {latestTaskId && taskTraces.length > 0 ? (
                    <TraceList
                      title={`Trace for task ${latestTaskId}`}
                      traces={taskTraces}
                    />
                  ) : null}
                </Card>

                <Card
                  title="Plan a change"
                  subtitle="Generate an approval-gated implementation plan for the active repository."
                >
                  <form
                    onSubmit={handleCreatePlan}
                    style={{ display: "grid", gap: 12, marginBottom: 16 }}
                  >
                    <input
                      value={planPrompt}
                      onChange={(event) => setPlanPrompt(event.target.value)}
                      placeholder="Add semantic retrieval traces to the repo analysis flow"
                      style={inputStyle}
                      disabled={selectedRepository.status !== "indexed"}
                    />
                    <button
                      type="submit"
                      disabled={
                        selectedRepository.status !== "indexed" || creatingPlan
                      }
                      style={buttonStyle}
                    >
                      {creatingPlan ? "Planning..." : "Create plan"}
                    </button>
                  </form>

                  {!latestPlan ? (
                    <p style={mutedTextStyle}>
                      No plan yet. Start with a scoped request for the active
                      repository.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: 16 }}>
                      <div style={summaryPanelStyle}>
                        <strong>{latestPlan.summary}</strong>
                      </div>

                      <PlanSection
                        title="Assumptions"
                        items={latestPlan.assumptions}
                        mutedTextStyle={mutedTextStyle}
                      />
                      <PlanSection
                        title="Impacted files"
                        items={latestPlan.impactedFiles}
                        mutedTextStyle={mutedTextStyle}
                      />
                      <PlanSection
                        title="Steps"
                        items={latestPlan.steps}
                        mutedTextStyle={mutedTextStyle}
                      />
                      <PlanSection
                        title="Risks"
                        items={latestPlan.risks}
                        mutedTextStyle={mutedTextStyle}
                      />
                      <PlanSection
                        title="Validation"
                        items={latestPlan.validation}
                        mutedTextStyle={mutedTextStyle}
                      />

                      {latestPlanMatches.length > 0 ? (
                        <MatchList
                          title="Supporting evidence"
                          matches={latestPlanMatches}
                        />
                      ) : null}

                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <button
                          onClick={() => void handlePlanApproval("approved")}
                          style={buttonStyle}
                        >
                          Approve plan
                        </button>
                        <button
                          onClick={() => void handlePlanApproval("rejected")}
                          style={secondaryButtonStyle}
                        >
                          Reject plan
                        </button>
                      </div>

                      {latestPlanApprovals.length > 0 ? (
                        <ApprovalList approvals={latestPlanApprovals} />
                      ) : null}

                      {latestPlanTaskId && latestPlanTraces.length > 0 ? (
                        <TraceList
                          title={`Trace for task ${latestPlanTaskId}`}
                          traces={latestPlanTraces}
                        />
                      ) : null}
                    </div>
                  )}
                </Card>
              </div>

              <Card
                title="Patch and validation"
                subtitle="Turn an approved plan into a bounded patch artifact and run safe local checks."
              >
                {!latestPlan ||
                latestPlanApprovals.every(
                  (approval) => approval.status !== "approved",
                ) ? (
                  <p style={mutedTextStyle}>
                    Approve a plan for this repository before drafting a patch.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 16 }}>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button
                        onClick={() => void handleCreatePatch()}
                        disabled={creatingPatch}
                        style={buttonStyle}
                      >
                        {creatingPatch
                          ? "Drafting patch..."
                          : "Create patch draft"}
                      </button>
                    </div>

                    {latestPatchArtifacts.length > 0 ? (
                      <ArtifactList
                        title="Patch artifacts"
                        artifacts={latestPatchArtifacts}
                      />
                    ) : null}

                    {latestPatchApprovals.length > 0 ? (
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <button
                          onClick={() => void handlePatchApproval("approved")}
                          style={buttonStyle}
                        >
                          Approve patch
                        </button>
                        <button
                          onClick={() => void handlePatchApproval("rejected")}
                          style={secondaryButtonStyle}
                        >
                          Reject patch
                        </button>
                      </div>
                    ) : null}

                    {latestPatchApprovals.length > 0 ? (
                      <ApprovalList approvals={latestPatchApprovals} />
                    ) : null}

                    {latestPatchTraces.length > 0 ? (
                      <TraceList title="Patch trace" traces={latestPatchTraces} />
                    ) : null}

                    {latestPatchTaskId ? (
                      <div style={{ display: "grid", gap: 12 }}>
                        <input
                          value={validationTestCommand}
                          onChange={(event) =>
                            setValidationTestCommand(event.target.value)
                          }
                          placeholder="Optional test command, e.g. pnpm test auth"
                          style={inputStyle}
                        />
                        <button
                          onClick={() => void handleRunValidation()}
                          disabled={runningValidation}
                          style={buttonStyle}
                        >
                          {runningValidation
                            ? "Running validation..."
                            : "Run validation"}
                        </button>
                      </div>
                    ) : null}

                    {latestValidationArtifacts.length > 0 ? (
                      <ArtifactList
                        title="Validation reports"
                        artifacts={latestValidationArtifacts}
                      />
                    ) : null}

                    {latestValidationTraces.length > 0 ? (
                      <TraceList
                        title={
                          latestValidationTaskId
                            ? `Validation trace for task ${latestValidationTaskId}`
                            : "Validation trace"
                        }
                        traces={latestValidationTraces}
                      />
                    ) : null}
                  </div>
                )}
              </Card>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function RepositoryOverviewPanel({
  overview,
  summary,
}: {
  overview: AnalysisResult;
  summary: string | null;
}) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={highlightPanelStyle}>
        <strong>{overview.title}</strong>
        <div style={{ marginTop: 8 }}>{overview.answer}</div>
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

      {overview.sections && overview.sections.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {overview.sections.map((section) => (
            <article key={section.title} style={sectionCardStyle}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                {section.title}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {section.items.map((item, index) => (
                  <div key={`${section.title}-${index}-${item}`} style={sectionItemStyle}>
                    {item}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {summary ? (
        <div style={summaryPanelStyle}>
          <div style={{ ...mutedTextStyle, marginBottom: 6 }}>Index summary</div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{summary}</div>
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

const heroStyle: React.CSSProperties = {
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

const heroMetaStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
};

const eyebrowStyle: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 11,
  fontWeight: 700,
  color: "#7c8aa0",
};

const twoColumnLayoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
  gap: 20,
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

const highlightPanelStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  lineHeight: 1.6,
  color: "#e5e7eb",
  background: "#151a22",
  border: "1px solid #2a3240",
  borderRadius: 16,
  padding: 14,
};

const summaryPanelStyle: React.CSSProperties = {
  background: "#131820",
  border: "1px solid #262f3c",
  borderRadius: 14,
  padding: 14,
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
