import React from "react";
import {
  buttonStyle,
  inputStyle,
  modalActionRowStyle,
  secondaryButtonStyle,
} from "../styles";
import { ModalShell } from "./ModalShell";

export function WorkspaceModal({
  workspaceName,
  submittingWorkspace,
  onChangeWorkspaceName,
  onClose,
  onSubmit,
}: {
  workspaceName: string;
  submittingWorkspace: boolean;
  onChangeWorkspaceName: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <ModalShell
      title="Create workspace"
      description="Set up a clean workspace to group related repositories."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          value={workspaceName}
          onChange={(event) => onChangeWorkspaceName(event.target.value)}
          placeholder="Workspace name"
          style={inputStyle}
          autoFocus
        />
        <div style={modalActionRowStyle}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            Cancel
          </button>
          <button type="submit" disabled={submittingWorkspace} style={buttonStyle}>
            {submittingWorkspace ? "Creating..." : "Create workspace"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
