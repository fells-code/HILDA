import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { Card } from "./components/Card";
import { StatusBadge } from "./components/StatusBadge";
import {
  askQuestion,
  createRepository,
  createWorkspace,
  getRepositoryIndexStatus,
  listRepositories,
  listWorkspaces,
  type QuestionMatch,
  type Repository,
  type RepositoryIndex,
  type Workspace,
} from "./lib/api";

function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryIndexes, setRepositoryIndexes] = useState<
    Record<string, RepositoryIndex | null>
  >({});
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
  const [error, setError] = useState<string>("");
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [questionMatches, setQuestionMatches] = useState<QuestionMatch[]>([]);
  const [questionRepositoryName, setQuestionRepositoryName] = useState("");

  const selectedWorkspace = useMemo(
    () =>
      workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ??
      null,
    [workspaces, selectedWorkspaceId],
  );

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

      if (
        response.repositories.length > 0 &&
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

  async function handleAskQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRepositoryId || !question.trim()) {
      return;
    }

    setAskingQuestion(true);
    setError("");

    try {
      const response = await askQuestion({
        repositoryId: selectedRepositoryId,
        question: question.trim(),
      });

      setQuestionMatches(response.matches);
      setQuestionRepositoryName(response.repository.name);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to search repository",
      );
    } finally {
      setAskingQuestion(false);
    }
  }

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setRepositories([]);
      setRepositoryIndexes({});
      return;
    }

    void loadRepositories(selectedWorkspaceId);

    const interval = window.setInterval(() => {
      void loadRepositories(selectedWorkspaceId, { background: true });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [selectedWorkspaceId]);

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

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 20px 48px",
        }}
      >
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 36 }}>HILDA</h1>
          <p style={{ margin: "10px 0 0", color: "#475569", fontSize: 16 }}>
            Human-in-the-loop development agents
          </p>
        </header>

        {error ? (
          <div
            style={{
              marginBottom: 20,
              padding: 12,
              borderRadius: 12,
              background: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 20 }}>
            <Card
              title="Workspaces"
              subtitle="Create and select a workspace for repository indexing."
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
                <div style={{ display: "grid", gap: 8 }}>
                  {workspaces.map((workspace) => {
                    const isSelected = workspace.id === selectedWorkspaceId;

                    return (
                      <button
                        key={workspace.id}
                        onClick={() => setSelectedWorkspaceId(workspace.id)}
                        style={{
                          textAlign: "left",
                          padding: 12,
                          borderRadius: 12,
                          border: isSelected
                            ? "1px solid #2563eb"
                            : "1px solid #e5e7eb",
                          background: isSelected ? "#eff6ff" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{workspace.name}</div>
                        <div style={{ ...mutedTextStyle, marginTop: 4 }}>
                          {workspace.id}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            <Card
              title="Repository setup"
              subtitle={
                selectedWorkspace
                  ? `Selected workspace: ${selectedWorkspace.name}`
                  : "Select a workspace first"
              }
            >
              <form
                onSubmit={handleCreateRepository}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 180px",
                  gap: 12,
                }}
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
                  style={{ ...inputStyle, gridColumn: "1 / span 2" }}
                  disabled={!selectedWorkspace}
                />
                <button
                  type="submit"
                  disabled={!selectedWorkspace || submittingRepository}
                  style={{ ...buttonStyle, gridColumn: "1 / span 2" }}
                >
                  {submittingRepository
                    ? "Adding repository..."
                    : "Add repository"}
                </button>
              </form>
            </Card>

            <Card
              title="Repositories"
              subtitle="Repository ingestion status and latest summary."
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
                <p style={mutedTextStyle}>
                  Create or select a workspace to continue.
                </p>
              ) : loadingRepositories && repositories.length === 0 ? (
                <p style={mutedTextStyle}>Loading repositories...</p>
              ) : repositories.length === 0 ? (
                <p style={mutedTextStyle}>No repositories added yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {refreshingRepositories ? (
                    <div style={mutedTextStyle}>Refreshing...</div>
                  ) : null}
                  <div style={{ display: "grid", gap: 16 }}>
                    {repositories.map((repository) => {
                      const index = repositoryIndexes[repository.id] ?? null;

                      return (
                        <article
                          key={repository.id}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 14,
                            padding: 16,
                            background: "#fff",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "center",
                              marginBottom: 10,
                            }}
                          >
                            <div>
                              <h3 style={{ margin: 0, fontSize: 18 }}>
                                {repository.name}
                              </h3>
                              <p
                                style={{ ...mutedTextStyle, margin: "6px 0 0" }}
                              >
                                Branch: {repository.defaultBranch}
                              </p>
                            </div>
                            <StatusBadge status={repository.status} />
                          </div>

                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={metaRowStyle}>
                              <span style={metaLabelStyle}>Clone URL</span>
                              <span style={metaValueStyle}>
                                {repository.cloneUrl ?? "Not provided"}
                              </span>
                            </div>
                            <div style={metaRowStyle}>
                              <span style={metaLabelStyle}>
                                Latest index status
                              </span>
                              <span style={metaValueStyle}>
                                {index?.status ?? "none"}
                              </span>
                            </div>
                            <div style={metaRowStyle}>
                              <span style={metaLabelStyle}>Indexed at</span>
                              <span style={metaValueStyle}>
                                {index?.indexedAt
                                  ? new Date(index.indexedAt).toLocaleString()
                                  : "Not indexed yet"}
                              </span>
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <div
                                style={{ ...metaLabelStyle, marginBottom: 6 }}
                              >
                                Summary
                              </div>
                              <div
                                style={{
                                  whiteSpace: "pre-wrap",
                                  lineHeight: 1.5,
                                  color: "#1e293b",
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: 12,
                                  padding: 12,
                                }}
                              >
                                {index?.summary ?? "No summary available yet."}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            <Card
              title="Ask repository"
              subtitle="Search indexed repository files and docs for evidence."
            >
              <form
                onSubmit={handleAskQuestion}
                style={{
                  display: "grid",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <select
                  value={selectedRepositoryId}
                  onChange={(event) =>
                    setSelectedRepositoryId(event.target.value)
                  }
                  style={inputStyle}
                  disabled={repositories.length === 0}
                >
                  <option value="">Select a repository</option>
                  {repositories.map((repository) => (
                    <option key={repository.id} value={repository.id}>
                      {repository.name}
                    </option>
                  ))}
                </select>

                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Where is refresh token rotation implemented?"
                  style={inputStyle}
                  disabled={!selectedRepositoryId}
                />

                <button
                  type="submit"
                  disabled={!selectedRepositoryId || askingQuestion}
                  style={buttonStyle}
                >
                  {askingQuestion ? "Searching..." : "Ask"}
                </button>
              </form>

              {questionMatches.length === 0 ? (
                <p style={mutedTextStyle}>
                  No evidence yet. Ask a repository question.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={mutedTextStyle}>
                    Results from {questionRepositoryName}
                  </div>
                  {questionMatches.map((match) => (
                    <article
                      key={`${match.path}-${match.score}`}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 14,
                        background: "#fff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 8,
                        }}
                      >
                        <strong>{match.path}</strong>
                        <span style={mutedTextStyle}>score {match.score}</span>
                      </div>
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.5,
                          color: "#1e293b",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        {match.snippet}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "12px 14px",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 600,
  cursor: "pointer",
};

const mutedTextStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 14,
};

const metaRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "160px 1fr",
  gap: 12,
};

const metaLabelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  fontWeight: 600,
};

const metaValueStyle: React.CSSProperties = {
  color: "#0f172a",
  fontSize: 14,
  wordBreak: "break-word",
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
