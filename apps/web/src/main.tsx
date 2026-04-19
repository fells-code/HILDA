import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { AppEmptyState } from "./components/AppEmptyState";
import { ChatHistory } from "./components/ChatHistory";
import { PromptComposer } from "./components/PromptComposer";
import { RepositoryHeader } from "./components/RepositoryHeader";
import { RepositoryModal } from "./components/RepositoryModal";
import { RepositoryOverviewAccordion } from "./components/RepositoryOverviewAccordion";
import { Sidebar } from "./components/Sidebar";
import { WorkflowPanel } from "./components/WorkflowPanel";
import { WorkspaceModal } from "./components/WorkspaceModal";
import { useRepositoryWorkflow } from "./hooks/useRepositoryWorkflow";
import { useWorkspaceData } from "./hooks/useWorkspaceData";
import {
  chatHistoryStyle,
  contentStyle,
  errorStyle,
  pageStyle,
  shellStyle,
  workspaceCanvasStyle,
} from "./styles";

function App() {
  const [error, setError] = useState("");
  const workspaceData = useWorkspaceData({ setError });
  const workflow = useRepositoryWorkflow({
    selectedRepositoryId: workspaceData.selectedRepositoryId,
    setError,
    onRepositoryOverviewUpdated: workspaceData.upsertRepositoryOverview,
  });
  const selectedWorkspace = workspaceData.selectedWorkspace;
  const selectedRepository = workspaceData.selectedRepository;

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <Sidebar
          workspaces={workspaceData.workspaces}
          selectedWorkspaceId={workspaceData.selectedWorkspaceId}
          repositories={workspaceData.repositories}
          repositoryIndexes={workspaceData.repositoryIndexes}
          selectedRepositoryId={workspaceData.selectedRepositoryId}
          loadingWorkspaces={workspaceData.loadingWorkspaces}
          loadingRepositories={workspaceData.loadingRepositories}
          deletingRepositoryId={workspaceData.deletingRepositoryId}
          onSelectWorkspace={workspaceData.setSelectedWorkspaceId}
          onSelectRepository={workspaceData.setSelectedRepositoryId}
          onOpenWorkspaceModal={workspaceData.openWorkspaceModal}
          onOpenRepositoryModal={workspaceData.openRepositoryModal}
          onRefreshRepositories={() => {
            if (workspaceData.selectedWorkspaceId) {
              void workspaceData.refreshRepositories(workspaceData.selectedWorkspaceId, {
                background: true,
              });
            }
          }}
          onDeleteRepository={(repository) => {
            void workspaceData.handleDeleteRepository(repository);
          }}
        />

        <section style={contentStyle}>
          {error ? <div style={errorStyle}>{error}</div> : null}

          {!selectedWorkspace ? (
            <AppEmptyState
              title="Start with a workspace"
              subtitle="Create a workspace in the left sidebar to begin organizing repositories."
              body="HILDA works best when each workspace has a clean set of repositories and a clear developer context."
            />
          ) : !selectedRepository ? (
            <AppEmptyState
              title="Select a repository"
              subtitle={`Choose the repo you want to work on inside ${selectedWorkspace.name}.`}
              body="Once a repository is selected, HILDA will pre-load its overview and make chat, planning, and validation available in one place."
            />
          ) : (
            <>
              <RepositoryHeader
                workspaceName={selectedWorkspace.name}
                repository={selectedRepository}
                repositoryIndex={workspaceData.selectedRepositoryIndex}
                overview={workspaceData.selectedRepositoryOverview}
                metadata={workspaceData.selectedRepositoryMetadata}
                isOverviewLoading={
                  workspaceData.loadingOverviewRepositoryId === selectedRepository.id
                }
                isMetadataLoading={
                  workspaceData.loadingRepositoryMetadataId === selectedRepository.id
                }
                isDeleting={workspaceData.deletingRepositoryId === selectedRepository.id}
                onDelete={() =>
                  void workspaceData.handleDeleteRepository(selectedRepository)
                }
                onRefresh={workspaceData.refreshSelectedRepositoryContext}
              />

              <RepositoryOverviewAccordion
                repository={selectedRepository}
                repositoryIndex={workspaceData.selectedRepositoryIndex}
                overview={workspaceData.selectedRepositoryOverview}
                isLoading={
                  workspaceData.loadingOverviewRepositoryId === selectedRepository.id
                }
              />

              <section style={workspaceCanvasStyle}>
                <div style={chatHistoryStyle}>
                  <ChatHistory chatHistory={workflow.chatHistory} />

                  <WorkflowPanel
                    activeWorkflowPanel={workflow.activeWorkflowPanel}
                    questionAnswer={workflow.questionAnswer}
                    questionMatches={workflow.questionMatches}
                    latestTaskId={workflow.latestTaskId}
                    taskTraces={workflow.taskTraces}
                    latestPlan={workflow.latestPlan}
                    latestPlanApprovals={workflow.latestPlanApprovals}
                    latestPlanMatches={workflow.latestPlanMatches}
                    latestPlanTaskId={workflow.latestPlanTaskId}
                    latestPlanTraces={workflow.latestPlanTraces}
                    latestPatchArtifacts={workflow.latestPatchArtifacts}
                    latestPatchApprovals={workflow.latestPatchApprovals}
                    latestPatchTraces={workflow.latestPatchTraces}
                    latestValidationArtifacts={workflow.latestValidationArtifacts}
                    latestValidationTaskId={workflow.latestValidationTaskId}
                    latestValidationTraces={workflow.latestValidationTraces}
                    onApprovePlan={() => void workflow.handlePlanApproval("approved")}
                    onRejectPlan={() => void workflow.handlePlanApproval("rejected")}
                    onCreatePatch={() => void workflow.handleCreatePatch()}
                    onApprovePatch={() => void workflow.handlePatchApproval("approved")}
                    onRejectPatch={() => void workflow.handlePatchApproval("rejected")}
                    onRunValidation={() => void workflow.handleRunValidation()}
                    creatingPatch={workflow.creatingPatch}
                    runningValidation={workflow.runningValidation}
                    latestPatchTaskId={workflow.latestPatchTaskId}
                    validationTestCommand={workflow.validationTestCommand}
                    setValidationTestCommand={workflow.setValidationTestCommand}
                  />
                </div>

                <PromptComposer
                  question={workflow.question}
                  askingQuestion={workflow.askingQuestion}
                  disabled={selectedRepository.status !== "indexed"}
                  onChangeQuestion={workflow.setQuestion}
                  onSubmit={workflow.handleAskQuestion}
                />
              </section>
            </>
          )}
        </section>
      </div>

      {workspaceData.isWorkspaceModalOpen ? (
        <WorkspaceModal
          workspaceName={workspaceData.workspaceName}
          submittingWorkspace={workspaceData.submittingWorkspace}
          onChangeWorkspaceName={workspaceData.setWorkspaceName}
          onSubmit={workspaceData.handleCreateWorkspace}
          onClose={workspaceData.closeWorkspaceModal}
        />
      ) : null}

      {workspaceData.isRepositoryModalOpen ? (
        <RepositoryModal
          selectedWorkspace={selectedWorkspace}
          repositoryForm={workspaceData.repositoryForm}
          submittingRepository={workspaceData.submittingRepository}
          pickingLocalDirectory={workspaceData.pickingLocalDirectory}
          onChangeRepositoryForm={workspaceData.setRepositoryForm}
          onSubmit={workspaceData.handleCreateRepository}
          onPickLocalDirectory={() => void workspaceData.handlePickLocalDirectory()}
          onClose={workspaceData.closeRepositoryModal}
        />
      ) : null}
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
