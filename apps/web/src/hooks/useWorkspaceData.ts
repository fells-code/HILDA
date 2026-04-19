import { useCallback, useEffect, useMemo, useState } from "react";
import {
  askRepository,
  createRepository,
  createWorkspace,
  deleteRepository,
  getRepositoryIndexStatus,
  getRepositoryMetadata,
  listRepositories,
  listWorkspaces,
  pickLocalDirectory,
  type AnalysisResult,
  type Repository,
  type RepositoryIndex,
  type RepositoryMetadata,
  type Workspace,
} from "../lib/api";
import type { RepositoryForm } from "../types/repositoryForm";

const EMPTY_REPOSITORY_FORM: RepositoryForm = {
  provider: "github",
  name: "",
  defaultBranch: "main",
  cloneUrl: "",
  localPath: "",
};

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

export function useWorkspaceData({
  setError,
}: {
  setError: React.Dispatch<React.SetStateAction<string>>;
}) {
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
  const [repositoryForm, setRepositoryForm] =
    useState<RepositoryForm>(EMPTY_REPOSITORY_FORM);
  const [submittingWorkspace, setSubmittingWorkspace] = useState(false);
  const [submittingRepository, setSubmittingRepository] = useState(false);
  const [pickingLocalDirectory, setPickingLocalDirectory] = useState(false);
  const [deletingRepositoryId, setDeletingRepositoryId] = useState("");
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");

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

  const loadWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    setError("");

    try {
      const response = await listWorkspaces();
      setWorkspaces(response.workspaces);
      setSelectedWorkspaceId((current) => current || response.workspaces[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspaces");
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [setError]);

  const loadRepositories = useCallback(
    async (workspaceId: string, options?: { background?: boolean }) => {
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
        setSelectedRepositoryId((current) => {
          if (response.repositories.length === 0) {
            return "";
          }

          return response.repositories.some((repository) => repository.id === current)
            ? current
            : response.repositories[0].id;
        });

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
    },
    [setError],
  );

  const loadRepositoryOverview = useCallback(
    async (repository: Repository) => {
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
    },
    [loadingOverviewRepositoryId, repositoryIndexes, repositoryOverviewCache, setError],
  );

  const loadRepositoryMetadata = useCallback(
    async (repository: Repository) => {
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
    },
    [loadingRepositoryMetadataId, repositoryMetadataCache],
  );

  const handleCreateWorkspace = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
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
    },
    [loadWorkspaces, setError, workspaceName],
  );

  const handleCreateRepository = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
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

        setRepositoryForm(EMPTY_REPOSITORY_FORM);
        setIsRepositoryModalOpen(false);

        await loadRepositories(selectedWorkspaceId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create repository");
      } finally {
        setSubmittingRepository(false);
      }
    },
    [loadRepositories, repositoryForm, selectedWorkspaceId, setError],
  );

  const handlePickLocalDirectory = useCallback(async () => {
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
  }, [setError]);

  const handleDeleteRepository = useCallback(
    async (repository: Repository) => {
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

        let remainingRepositories: Repository[] = [];
        setRepositories((current) => {
          remainingRepositories = current.filter((item) => item.id !== repository.id);
          return remainingRepositories;
        });

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
        setSelectedRepositoryId((current) =>
          current === repository.id ? remainingRepositories[0]?.id || "" : current,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete repository");
      } finally {
        setDeletingRepositoryId("");
      }
    },
    [selectedWorkspace, setError],
  );

  const refreshSelectedRepositoryContext = useCallback(() => {
    if (!selectedRepository) {
      return;
    }

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
  }, [loadRepositoryMetadata, loadRepositoryOverview, selectedRepository]);

  const upsertRepositoryOverview = useCallback(
    (repositoryId: string, overview: AnalysisResult) => {
      setRepositoryOverviewCache((current) => ({
        ...current,
        [repositoryId]: overview,
      }));
    },
    [],
  );

  const openWorkspaceModal = useCallback(() => {
    setIsWorkspaceModalOpen(true);
  }, []);

  const closeWorkspaceModal = useCallback(() => {
    setIsWorkspaceModalOpen(false);
    setWorkspaceName("");
  }, []);

  const openRepositoryModal = useCallback(() => {
    setIsRepositoryModalOpen(true);
  }, []);

  const closeRepositoryModal = useCallback(() => {
    setIsRepositoryModalOpen(false);
    setRepositoryForm(EMPTY_REPOSITORY_FORM);
  }, []);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

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
  }, [loadRepositories, selectedWorkspaceId, shouldPollRepositories]);

  useEffect(() => {
    if (!selectedRepository) {
      return;
    }

    void loadRepositoryOverview(selectedRepository);
    void loadRepositoryMetadata(selectedRepository);
  }, [
    loadRepositoryMetadata,
    loadRepositoryOverview,
    repositoryIndexes,
    repositoryMetadataCache,
    repositoryOverviewCache,
    selectedRepository,
  ]);

  return {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    selectedWorkspace,
    repositories,
    repositoryIndexes,
    loadingWorkspaces,
    loadingRepositories,
    selectedRepositoryId,
    setSelectedRepositoryId,
    selectedRepository,
    selectedRepositoryIndex,
    selectedRepositoryOverview,
    selectedRepositoryMetadata,
    loadingOverviewRepositoryId,
    loadingRepositoryMetadataId,
    deletingRepositoryId,
    refreshRepositories: loadRepositories,
    refreshSelectedRepositoryContext,
    upsertRepositoryOverview,
    workspaceName,
    setWorkspaceName,
    isWorkspaceModalOpen,
    openWorkspaceModal,
    closeWorkspaceModal,
    submittingWorkspace,
    handleCreateWorkspace,
    repositoryForm,
    setRepositoryForm,
    isRepositoryModalOpen,
    openRepositoryModal,
    closeRepositoryModal,
    submittingRepository,
    pickingLocalDirectory,
    handleCreateRepository,
    handlePickLocalDirectory,
    handleDeleteRepository,
  };
}
