import React from "react";
import type { Repository, RepositoryIndex, Workspace } from "../lib/api";
import { getStatusDotColor } from "../lib/status";
import {
  brandMarkStyle,
  iconButtonStyle,
  repoTreeButtonStyle,
  repoTreeListStyle,
  repoTreeMetaStyle,
  repoTreePrimaryStyle,
  repoTreeRowStyle,
  rowIconButtonStyle,
  sidebarBrandRowStyle,
  sidebarBrandSubtitleStyle,
  sidebarBrandTitleStyle,
  sidebarHeaderStyle,
  sidebarStyle,
  statusDotStyle,
  treeActionButtonStyle,
  treeChildrenStyle,
  treeCountStyle,
  treeDetailsStyle,
  treeHintStyle,
  treeListStyle,
  treePanelHeaderStyle,
  treePanelStyle,
  treePanelTitleStyle,
  treeSummaryLabelStyle,
  treeSummaryStyle,
  workspaceActionsRowStyle,
} from "../styles";
import {
  ChevronIcon,
  FolderIcon,
  FolderTreeIcon,
  GithubIcon,
  HardDriveIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
} from "./icons";

export function Sidebar({
  workspaces,
  selectedWorkspaceId,
  repositories,
  repositoryIndexes,
  selectedRepositoryId,
  loadingWorkspaces,
  loadingRepositories,
  deletingRepositoryId,
  onSelectWorkspace,
  onSelectRepository,
  onOpenWorkspaceModal,
  onOpenRepositoryModal,
  onRefreshRepositories,
  onDeleteRepository,
}: {
  workspaces: Workspace[];
  selectedWorkspaceId: string;
  repositories: Repository[];
  repositoryIndexes: Record<string, RepositoryIndex | null>;
  selectedRepositoryId: string;
  loadingWorkspaces: boolean;
  loadingRepositories: boolean;
  deletingRepositoryId: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectRepository: (repositoryId: string) => void;
  onOpenWorkspaceModal: () => void;
  onOpenRepositoryModal: () => void;
  onRefreshRepositories: () => void;
  onDeleteRepository: (repository: Repository) => void;
}) {
  return (
    <aside style={sidebarStyle}>
      <div style={sidebarHeaderStyle}>
        <div style={sidebarBrandRowStyle}>
          <div style={brandMarkStyle}>H</div>
          <div>
            <div style={sidebarBrandTitleStyle}>HILDA</div>
            <div style={sidebarBrandSubtitleStyle}>Human in loop development</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenWorkspaceModal}
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
            <span>Workspaces</span>
          </div>
        </div>

        {loadingWorkspaces ? (
          <div style={treeHintStyle}>Loading workspaces...</div>
        ) : workspaces.length === 0 ? (
          <div style={treeHintStyle}>
            No workspaces yet. Create one to start organizing repositories.
          </div>
        ) : (
          <div style={treeListStyle}>
            {workspaces.map((workspace) => {
              const isSelectedWorkspace = workspace.id === selectedWorkspaceId;
              const workspaceRepositories = repositories.filter(
                (repository) => repository.workspaceId === workspace.id,
              );

              return (
                <details
                  key={workspace.id}
                  open={isSelectedWorkspace}
                  style={treeDetailsStyle}
                >
                  <summary
                    style={{
                      ...treeSummaryStyle,
                      background: isSelectedWorkspace ? "#171d26" : "transparent",
                      border: isSelectedWorkspace
                        ? "1px solid #2c3644"
                        : "1px solid transparent",
                    }}
                    onClick={() => onSelectWorkspace(workspace.id)}
                  >
                    <div style={treeSummaryLabelStyle}>
                      <ChevronIcon open={isSelectedWorkspace} />
                      <FolderIcon />
                      <span>{workspace.name}</span>
                    </div>
                    <span style={treeCountStyle}>{workspaceRepositories.length}</span>
                  </summary>

                  {isSelectedWorkspace ? (
                    <div style={treeChildrenStyle}>
                      <div style={workspaceActionsRowStyle}>
                        <button
                          type="button"
                          onClick={onOpenRepositoryModal}
                          style={treeActionButtonStyle}
                        >
                          <PlusIcon />
                          <span>Add repo</span>
                        </button>
                        <button
                          type="button"
                          onClick={onRefreshRepositories}
                          style={treeActionButtonStyle}
                          disabled={loadingRepositories}
                        >
                          <RefreshIcon />
                          <span>{loadingRepositories ? "Refreshing" : "Refresh"}</span>
                        </button>
                      </div>

                      {workspaceRepositories.length === 0 ? (
                        <div style={treeHintStyle}>
                          No repositories yet. Add a GitHub repo or local directory.
                        </div>
                      ) : (
                        <div style={repoTreeListStyle}>
                          {workspaceRepositories.map((repository) => {
                            const isSelectedRepo = repository.id === selectedRepositoryId;
                            const index = repositoryIndexes[repository.id] ?? null;

                            return (
                              <div
                                key={repository.id}
                                style={{
                                  ...repoTreeRowStyle,
                                  background: isSelectedRepo ? "#18222e" : "transparent",
                                  borderColor: isSelectedRepo ? "#314154" : "transparent",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => onSelectRepository(repository.id)}
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
                                        background: getStatusDotColor(repository.status),
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
                                  onClick={() => onDeleteRepository(repository)}
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
  );
}
