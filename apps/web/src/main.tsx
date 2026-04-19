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
  pickLocalDirectory,
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
  const [loadingOverviewRepositoryId, setLoadingOverviewRepositoryId] = useState("");
  const [loadingRepositoryMetadataId, setLoadingRepositoryMetadataId] = useState("");
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingRepositories, setLoadingRepositories] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isRepositoryModalOpen, setIsRepositoryModalOpen] = useState(false);
  const [repositoryForm, setRepositoryForm] = useState({
    provider: "github" as "github" | "local",
    name: "",
    defaultBranch: "main",
    cloneUrl: "",
    localPath: "",
  });
  const [submittingWorkspace, setSubmittingWorkspace] = useState(false);
  const [submittingRepository, setSubmittingRepository] = useState(false);
  const [pickingLocalDirectory, setPickingLocalDirectory] = useState(false);
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
  const [latestPlanApprovals, setLatestPlanApprovals] = useState<ApprovalRequest[]>([]);
  const [latestPlanTraces, setLatestPlanTraces] = useState<TaskTrace[]>([]);
  const [latestPlanMatches, setLatestPlanMatches] = useState<QuestionMatch[]>([]);
  const [creatingPatch, setCreatingPatch] = useState(false);
  const [latestPatchTaskId, setLatestPatchTaskId] = useState("");
  const [latestPatchApprovalId, setLatestPatchApprovalId] = useState("");
  const [latestPatchApprovals, setLatestPatchApprovals] = useState<ApprovalRequest[]>([]);
  const [latestPatchArtifacts, setLatestPatchArtifacts] = useState<PatchArtifact[]>([]);
  const [latestPatchTraces, setLatestPatchTraces] = useState<TaskTrace[]>([]);
  const [runningValidation, setRunningValidation] = useState(false);
  const [latestValidationTaskId, setLatestValidationTaskId] = useState("");
  const [latestValidationArtifacts, setLatestValidationArtifacts] = useState<
    PatchArtifact[]
  >([]);
  const [latestValidationTraces, setLatestValidationTraces] = useState<TaskTrace[]>([]);
  const [validationTestCommand, setValidationTestCommand] = useState("");
  const [activeWorkflowPanel, setActiveWorkflowPanel] = useState<
    "idle" | "question" | "plan" | "patch" | "validation"
  >("idle");
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null,
    [workspaces, selectedWorkspaceId],
  );

  const selectedRepository = useMemo(
    () =>
      repositories.find((repository) => repository.id === selectedRepositoryId) ?? null,
    [repositories, selectedRepositoryId],
  );

  const selectedRepositoryIndex = selectedRepository
    ? (repositoryIndexes[selectedRepository.id] ?? null)
    : null;

  const selectedRepositoryOverview = selectedRepository
    ? (repositoryOverviewCache[selectedRepository.id] ?? null)
    : null;
  const selectedRepositoryMetadata = selectedRepository
    ? (repositoryMetadataCache[selectedRepository.id] ?? null)
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
      setError(err instanceof Error ? err.message : "Failed to load workspaces");
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
      setError(err instanceof Error ? err.message : "Failed to load repositories");
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
      setError(err instanceof Error ? err.message : "Failed to generate overview");
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
          body: formatOverviewChatBody(response.result),
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
      setError(err instanceof Error ? err.message : "Failed to search repository");
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
      setError(err instanceof Error ? err.message : "Failed to update approval");
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
      setError(err instanceof Error ? err.message : "Failed to update patch approval");
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

  async function handleCreateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspaceName.trim()) {
      return;
    }

    setSubmittingWorkspace(true);
    setError("");

    try {
      const response = await createWorkspace({ name: workspaceName.trim() });
      setWorkspaceName("");
      setIsWorkspaceModalOpen(false);
      await loadWorkspaces();
      setSelectedWorkspaceId(response.workspace.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setSubmittingWorkspace(false);
    }
  }

  async function handleCreateRepository(event: React.FormEvent<HTMLFormElement>) {
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
      setIsRepositoryModalOpen(false);

      await loadRepositories(selectedWorkspaceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create repository");
    } finally {
      setSubmittingRepository(false);
    }
  }

  async function handlePickLocalDirectory() {
    setPickingLocalDirectory(true);
    setError("");

    try {
      const response = await pickLocalDirectory();
      const selectedPath = response.localPath.trim();

      setRepositoryForm((current) => ({
        ...current,
        provider: "local",
        localPath: selectedPath,
        name: current.name || selectedPath.split("/").filter(Boolean).at(-1) || "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pick local directory");
    } finally {
      setPickingLocalDirectory(false);
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

      setRepositories((current) => current.filter((item) => item.id !== repository.id));
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
      setError(err instanceof Error ? err.message : "Failed to delete repository");
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
          <div style={sidebarHeaderStyle}>
            <div style={sidebarBrandRowStyle}>
              <div style={brandMarkStyle}>H</div>
              <div>
                <div style={sidebarBrandTitleStyle}>HILDA</div>
                <div style={sidebarBrandSubtitleStyle}>Repo workspaces</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsWorkspaceModalOpen(true)}
              style={iconButtonStyle}
              title="Create workspace"
            >
              <PlusIcon />
            </button>
          </div>

          <div style={treePanelStyle}>
            <div style={treePanelHeaderStyle}>
              <div style={treePanelTitleStyle}>
                <FolderTreeIcon />
                Workspaces
              </div>
            </div>

            {loadingWorkspaces ? (
              <p style={mutedTextStyle}>Loading workspaces...</p>
            ) : workspaces.length === 0 ? (
              <p style={mutedTextStyle}>No workspaces yet.</p>
            ) : (
              <div style={treeListStyle}>
                {workspaces.map((workspace) => {
                  const isSelectedWorkspace = workspace.id === selectedWorkspaceId;
                  const workspaceRepositories = isSelectedWorkspace ? repositories : [];

                  return (
                    <details
                      key={workspace.id}
                      open={isSelectedWorkspace}
                      style={treeDetailsStyle}
                    >
                      <summary
                        style={{
                          ...treeSummaryStyle,
                          background: isSelectedWorkspace ? "#161d27" : "transparent",
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          setSelectedWorkspaceId(workspace.id);
                        }}
                      >
                        <div style={treeSummaryLabelStyle}>
                          <ChevronIcon open={isSelectedWorkspace} />
                          <FolderIcon />
                          <span>{workspace.name}</span>
                        </div>
                        <span style={treeCountStyle}>
                          {isSelectedWorkspace ? repositories.length : ""}
                        </span>
                      </summary>

                      {isSelectedWorkspace ? (
                        <div style={treeChildrenStyle}>
                          <div style={workspaceActionsRowStyle}>
                            <button
                              type="button"
                              onClick={() => setIsRepositoryModalOpen(true)}
                              style={treeActionButtonStyle}
                            >
                              <PlusIcon />
                              Add repo
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void loadRepositories(workspace.id, {
                                  background: true,
                                })
                              }
                              style={treeActionButtonStyle}
                            >
                              <RefreshIcon />
                              Refresh
                            </button>
                          </div>

                          {loadingRepositories && repositories.length === 0 ? (
                            <div style={treeHintStyle}>Loading repositories...</div>
                          ) : workspaceRepositories.length === 0 ? (
                            <div style={treeHintStyle}>
                              No repositories in this workspace yet.
                            </div>
                          ) : (
                            <div style={repoTreeListStyle}>
                              {workspaceRepositories.map((repository) => {
                                const index = repositoryIndexes[repository.id] ?? null;
                                const isSelectedRepo =
                                  repository.id === selectedRepositoryId;

                                return (
                                  <div
                                    key={repository.id}
                                    style={{
                                      ...repoTreeRowStyle,
                                      background: isSelectedRepo
                                        ? "#18222e"
                                        : "transparent",
                                      borderColor: isSelectedRepo
                                        ? "#314154"
                                        : "transparent",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedRepositoryId(repository.id)
                                      }
                                      style={repoTreeButtonStyle}
                                    >
                                      <div style={repoTreePrimaryStyle}>
                                        {repository.provider === "github" ? (
                                          <GithubIcon />
                                        ) : (
                                          <HardDriveIcon />
                                        )}
                                        <span>{repository.name}</span>
                                      </div>
                                      <div style={repoTreeMetaStyle}>
                                        <span
                                          style={{
                                            ...statusDotStyle,
                                            background: getStatusDotColor(
                                              repository.status,
                                            ),
                                          }}
                                        />
                                        <span>
                                          {repository.provider === "local"
                                            ? "Local"
                                            : repository.defaultBranch}
                                        </span>
                                        <span>•</span>
                                        <span>{index?.status ?? "No index"}</span>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDeleteRepository(repository)
                                      }
                                      disabled={deletingRepositoryId === repository.id}
                                      style={rowIconButtonStyle}
                                      title="Delete repository"
                                    >
                                      <TrashIcon />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </details>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section style={contentStyle}>
          {error ? <div style={errorStyle}>{error}</div> : null}

          {!selectedWorkspace ? (
            <Card
              title="Start with a workspace"
              subtitle="Create a workspace in the left sidebar to begin organizing repositories."
            >
              <p style={mutedTextStyle}>
                HILDA works best when each workspace has a clean set of repositories and a
                clear developer context.
              </p>
            </Card>
          ) : !selectedRepository ? (
            <Card
              title="Select a repository"
              subtitle={`Choose the repo you want to work on inside ${selectedWorkspace.name}.`}
            >
              <p style={mutedTextStyle}>
                Once a repository is selected, HILDA will pre-load its overview and make
                chat, planning, and validation available in one place.
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
                        ? new Date(selectedRepositoryIndex.indexedAt).toLocaleString()
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
                    {extractLanguageNames(selectedRepositoryOverview).map((language) => (
                      <span key={`language-${language}`} style={headerChipStyle}>
                        {language}
                      </span>
                    ))}

                    {getOverviewMetric(selectedRepositoryOverview, "Files scanned") ? (
                      <span style={headerChipStyle}>
                        {
                          getOverviewMetric(selectedRepositoryOverview, "Files scanned")
                            ?.value
                        }{" "}
                        files
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
                <summary style={detailsSummaryStyle}>Full repository overview</summary>
                <div style={detailsContentStyle}>
                  {selectedRepository.status !== "indexed" ? (
                    <p style={mutedTextStyle}>
                      This repository needs to finish indexing before HILDA can build a
                      useful overview.
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
                        Ask HILDA to understand the codebase, locate an implementation,
                        debug a failure, or plan a change.
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
                          {renderChatEntryBody(entry)}
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
                      onClick={() => setQuestion("Where is authentication implemented?")}
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
                      onClick={() => setQuestion("How would we add a new feature here?")}
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
                      disabled={selectedRepository.status !== "indexed" || askingQuestion}
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

      {isWorkspaceModalOpen ? (
        <ModalShell
          title="Create workspace"
          description="Set up a clean workspace to group related repositories."
          onClose={() => {
            setIsWorkspaceModalOpen(false);
            setWorkspaceName("");
          }}
        >
          <form onSubmit={handleCreateWorkspace} style={{ display: "grid", gap: 12 }}>
            <input
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="Workspace name"
              style={inputStyle}
              autoFocus
            />
            <div style={modalActionRowStyle}>
              <button
                type="button"
                onClick={() => {
                  setIsWorkspaceModalOpen(false);
                  setWorkspaceName("");
                }}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
              <button type="submit" disabled={submittingWorkspace} style={buttonStyle}>
                {submittingWorkspace ? "Creating..." : "Create workspace"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {isRepositoryModalOpen ? (
        <ModalShell
          title="Add repository"
          description={
            selectedWorkspace
              ? `Connect a repository into ${selectedWorkspace.name}.`
              : "Select a workspace before adding a repository."
          }
          onClose={() => {
            setIsRepositoryModalOpen(false);
            setRepositoryForm({
              provider: "github",
              name: "",
              defaultBranch: "main",
              cloneUrl: "",
              localPath: "",
            });
          }}
        >
          <form onSubmit={handleCreateRepository} style={{ display: "grid", gap: 12 }}>
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
              <div style={{ display: "grid", gap: 10 }}>
                <div style={localPathBrowserRowStyle}>
                  <input
                    value={repositoryForm.localPath}
                    onChange={(event) =>
                      setRepositoryForm((current) => ({
                        ...current,
                        localPath: event.target.value,
                      }))
                    }
                    placeholder="Choose a local repository directory"
                    style={inputStyle}
                    disabled={!selectedWorkspace || pickingLocalDirectory}
                  />
                  <button
                    type="button"
                    onClick={() => void handlePickLocalDirectory()}
                    style={secondaryButtonStyle}
                    disabled={!selectedWorkspace || pickingLocalDirectory}
                  >
                    {pickingLocalDirectory ? "Browsing..." : "Browse..."}
                  </button>
                </div>
                <div style={mutedTextStyle}>
                  Pick a local folder and HILDA will index it directly.
                </div>
              </div>
            )}
            <div style={modalActionRowStyle}>
              <button
                type="button"
                onClick={() => {
                  setIsRepositoryModalOpen(false);
                  setRepositoryForm({
                    provider: "github",
                    name: "",
                    defaultBranch: "main",
                    cloneUrl: "",
                    localPath: "",
                  });
                }}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedWorkspace || submittingRepository}
                style={buttonStyle}
              >
                {submittingRepository ? "Adding..." : "Add repository"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </main>
  );
}

function getOverviewSection(overview: AnalysisResult | null, title: string) {
  return overview?.sections?.find((section) => section.title === title) ?? null;
}

function formatOverviewChatBody(result: AnalysisResult): string {
  const purpose = getOverviewSection(result, "Purpose")?.items[0];
  const architecture = (getOverviewSection(result, "Architecture")?.items ?? []).filter(
    (item) => !/:\s*none detected$/i.test(item),
  );
  const tooling = (
    getOverviewSection(result, "Frameworks and tooling")?.items ?? []
  ).filter((item) => !/^Detected:\s*$/i.test(item));
  const runtime = getOverviewSection(result, "Runtime and operations")?.items ?? [];
  const testing = getOverviewSection(result, "Testing and coverage")?.items ?? [];
  const issues = getOverviewSection(result, "Observed gaps and issues")?.items ?? [];
  const summary =
    result.answer
      .split(/(?<=[.?!])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)[0] ?? result.answer;

  const paragraphs = [
    `Summary: ${purpose ?? summary}`,
    architecture.length > 0
      ? `Architecture: ${architecture.slice(0, 2).join(" ")}`
      : null,
    tooling.length > 0 ? `Tooling: ${tooling.slice(0, 3).join(" ")}` : null,
    runtime.length > 0 ? `Runtime: ${runtime.slice(0, 3).join(" ")}` : null,
    testing.length > 0 ? `Testing: ${testing.slice(0, 2).join(" ")}` : null,
    issues.length > 0 ? `Risks: ${issues.slice(0, 2).join(" ")}` : null,
  ].filter(Boolean);

  if (paragraphs.length === 0) {
    return result.answer;
  }

  return paragraphs.join("\n\n");
}

function renderChatEntryBody(entry: ChatEntry) {
  if (entry.kind === "system" && entry.title === "Repository overview refreshed") {
    const paragraphs = entry.body
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    return (
      <div style={{ display: "grid", gap: 12 }}>
        {paragraphs.map((paragraph, index) => {
          const separatorIndex = paragraph.indexOf(":");
          const label = separatorIndex > 0 ? paragraph.slice(0, separatorIndex) : null;
          const value =
            separatorIndex > 0 ? paragraph.slice(separatorIndex + 1).trim() : paragraph;

          return (
            <div key={`${entry.id}-${index}`} style={{ lineHeight: 1.7 }}>
              {label ? <strong>{label}: </strong> : null}
              <span>{value}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return <div style={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{entry.body}</div>;
}

function getStatusDotColor(status: string) {
  switch (status) {
    case "indexed":
      return "#4ade80";
    case "syncing":
      return "#60a5fa";
    case "queued":
      return "#facc15";
    case "failed":
      return "#f87171";
    default:
      return "#94a3b8";
  }
}

function getOverviewMetric(overview: AnalysisResult | null, label: string) {
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
  const answer = overview?.answer
    ?.split(/\n\s*\n|\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (purpose) {
    return purpose;
  }

  if (answer) {
    return answer;
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

  return metadata?.githubIssuesOpen != null ? String(metadata.githubIssuesOpen) : "n/a";
}

function ModalShell({
  title,
  description,
  onClose,
  children,
}: React.PropsWithChildren<{
  title: string;
  description: string;
  onClose: () => void;
}>) {
  return (
    <div style={modalBackdropStyle} onClick={onClose}>
      <section style={modalCardStyle} onClick={(event) => event.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
            <div style={{ ...mutedTextStyle, marginTop: 6 }}>{description}</div>
          </div>
          <button type="button" onClick={onClose} style={iconButtonStyle}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function IconFrame({ children }: React.PropsWithChildren) {
  return <span style={iconFrameStyle}>{children}</span>;
}

function FolderTreeIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h6l2 2h10" />
        <path d="M3 6v12h8" />
        <path d="M13 12h8" />
        <path d="M17 12v6" />
        <path d="M13 18h8" />
      </svg>
    </IconFrame>
  );
}

function FolderIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 7h6l2 2h10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      </svg>
    </IconFrame>
  );
}

function GithubIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 19c-4.5 1.5-4.5-2.5-6.5-3m13 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 19.5 4.77 5.07 5.07 0 0 0 19.41 1S18.28.65 15.5 2.48a13.38 13.38 0 0 0-7 0C5.72.65 4.59 1 4.59 1A5.07 5.07 0 0 0 4.5 4.77 5.44 5.44 0 0 0 3 8.5c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 8.5 18.13V22" />
      </svg>
    </IconFrame>
  );
}

function HardDriveIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 15h.01" />
        <path d="M11 15h6" />
      </svg>
    </IconFrame>
  );
}

function RefreshIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 2v6h-6" />
        <path d="M3 12a9 9 0 0 1 15.55-6.36L21 8" />
        <path d="M3 22v-6h6" />
        <path d="M21 12a9 9 0 0 1-15.55 6.36L3 16" />
      </svg>
    </IconFrame>
  );
}

function PlusIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </IconFrame>
  );
}

function TrashIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    </IconFrame>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 120ms ease",
        color: "#7c8aa0",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  );
}

function CloseIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </IconFrame>
  );
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
                <summary style={detailsSummaryStyle}>Evidence and citations</summary>
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
        <details style={detailsStyle} open={activeWorkflowPanel === "validation"}>
          <summary style={detailsSummaryStyle}>Validation</summary>
          <div style={detailsContentStyle}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={validationComposerStyle}>
                <input
                  value={validationTestCommand}
                  onChange={(event) => setValidationTestCommand(event.target.value)}
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
                <div style={mutedTextStyle}>No validation run yet for this diff.</div>
              )}

              {latestValidationTraces.length > 0 ? (
                <details style={detailsStyle}>
                  <summary style={detailsSummaryStyle}>
                    Validation trace{" "}
                    {latestValidationTaskId ? `• ${latestValidationTaskId}` : ""}
                  </summary>
                  <div style={detailsContentStyle}>
                    <TraceList title="Task trace" traces={latestValidationTraces} />
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
              <div style={{ ...mutedTextStyle, marginBottom: 4 }}>{metric.label}</div>
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
                <div key={`architecture-${index}-${item}`} style={sectionItemStyle}>
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
                <div key={`milestone-${index}-${item}`} style={sectionItemStyle}>
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

function MatchList({ title, matches }: { title: string; matches: QuestionMatch[] }) {
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

function TraceList({ title, traces }: { title: string; traces: TaskTrace[] }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={mutedTextStyle}>{title}</div>
      {traces.map((trace) => (
        <article key={trace.id} style={traceCardStyle}>
          <div style={{ fontWeight: 700 }}>{trace.eventType}</div>
          <div style={{ ...mutedTextStyle, marginTop: 4 }}>
            {new Date(trace.createdAt).toLocaleString()}
          </div>
          <pre style={tracePreStyle}>{JSON.stringify(trace.eventDataJson, null, 2)}</pre>
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
  height: "100vh",
  overflow: "hidden",
  background: "#0f1115",
  color: "#e5e7eb",
  fontFamily:
    '"IBM Plex Sans", "Avenir Next", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
};

const shellStyle: React.CSSProperties = {
  maxWidth: 1560,
  margin: "0 auto",
  height: "100vh",
  padding: "16px 20px 16px 8px",
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "292px minmax(0, 1fr)",
  gap: 16,
  alignItems: "stretch",
};

const sidebarStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  height: "100%",
  minHeight: 0,
  alignContent: "start",
  overflow: "hidden",
};

const contentStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  height: "100%",
  minHeight: 0,
  gridTemplateRows: "auto auto minmax(0, 1fr)",
  overflow: "hidden",
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

const sidebarHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "4px 0 8px",
};

const sidebarBrandRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const brandMarkStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "#171d26",
  border: "1px solid #2a3340",
  color: "#dbe4ee",
  fontWeight: 800,
};

const sidebarBrandTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: "0.06em",
};

const sidebarBrandSubtitleStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#7c8aa0",
  marginTop: 2,
};

const treePanelStyle: React.CSSProperties = {
  minHeight: 0,
  display: "grid",
  gap: 8,
  padding: "8px 6px 10px",
  borderRadius: 16,
  background: "#12161d",
  border: "1px solid #202733",
};

const treePanelHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 6px",
};

const treePanelTitleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#7c8aa0",
};

const treeListStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  minHeight: 0,
};

const treeDetailsStyle: React.CSSProperties = {
  borderRadius: 12,
  overflow: "hidden",
};

const treeSummaryStyle: React.CSSProperties = {
  listStyle: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 10px",
  borderRadius: 12,
  cursor: "pointer",
  userSelect: "none",
};

const treeSummaryLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  fontWeight: 600,
};

const treeCountStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#7c8aa0",
};

const treeChildrenStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  padding: "8px 0 0 26px",
};

const workspaceActionsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const treeActionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid #29313d",
  borderRadius: 999,
  background: "#10151c",
  color: "#c8d1dd",
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
};

const treeHintStyle: React.CSSProperties = {
  color: "#7c8aa0",
  fontSize: 13,
  padding: "4px 8px 4px 2px",
};

const repoTreeListStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
};

const repoTreeRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 8,
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: 12,
  padding: "6px 8px",
};

const repoTreeButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "inherit",
  padding: 0,
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gap: 3,
};

const repoTreePrimaryStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 600,
  minWidth: 0,
};

const repoTreeMetaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "#7c8aa0",
  fontSize: 12,
  paddingLeft: 24,
};

const statusDotStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: 999,
  display: "inline-block",
};

const iconButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid #2a3340",
  background: "#12161d",
  color: "#c8d1dd",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const rowIconButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid transparent",
  background: "transparent",
  color: "#7c8aa0",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
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
  minHeight: 0,
  height: "100%",
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
  minHeight: 0,
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

const localPathBrowserRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "center",
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(6, 8, 12, 0.66)",
  display: "grid",
  placeItems: "center",
  padding: 24,
  zIndex: 100,
};

const modalCardStyle: React.CSSProperties = {
  width: "min(520px, 100%)",
  borderRadius: 18,
  border: "1px solid #2a3340",
  background: "#141922",
  boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
  padding: 20,
  display: "grid",
  gap: 18,
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const modalActionRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const iconFrameStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 0,
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
