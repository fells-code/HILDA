import React from "react";
import type { Workspace } from "../lib/api";
import type { RepositoryForm } from "../types/repositoryForm";
import {
  buttonStyle,
  inputStyle,
  localPathBrowserRowStyle,
  modalActionRowStyle,
  mutedTextStyle,
  secondaryButtonStyle,
} from "../styles";
import { ModalShell } from "./ModalShell";

export function RepositoryModal({
  selectedWorkspace,
  repositoryForm,
  submittingRepository,
  pickingLocalDirectory,
  onChangeRepositoryForm,
  onClose,
  onSubmit,
  onPickLocalDirectory,
}: {
  selectedWorkspace: Workspace | null;
  repositoryForm: RepositoryForm;
  submittingRepository: boolean;
  pickingLocalDirectory: boolean;
  onChangeRepositoryForm: (updater: (current: RepositoryForm) => RepositoryForm) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onPickLocalDirectory: () => void;
}) {
  return (
    <ModalShell
      title="Add repository"
      description={
        selectedWorkspace
          ? `Connect a repository into ${selectedWorkspace.name}.`
          : "Select a workspace before adding a repository."
      }
      onClose={onClose}
    >
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <select
          value={repositoryForm.provider}
          onChange={(event) =>
            onChangeRepositoryForm((current) => ({
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
            onChangeRepositoryForm((current) => ({
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
                onChangeRepositoryForm((current) => ({
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
                onChangeRepositoryForm((current) => ({
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
                  onChangeRepositoryForm((current) => ({
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
                onClick={onPickLocalDirectory}
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
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
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
  );
}
