import React from "react";
import { PlanSection } from "./PlanSection";
import { StatusBadge } from "./StatusBadge";
import type {
  ApprovalRequest,
  GeneratedPlan,
  PatchArtifact,
  QuestionMatch,
  TaskTrace,
} from "../lib/api";
import {
  actionRowStyle,
  approvalCardStyle,
  artifactPreStyle,
  buttonStyle,
  dangerButtonStyle,
  detailsContentStyle,
  detailsStyle,
  detailsSummaryStyle,
  inputStyle,
  mutedTextStyle,
  reasonListStyle,
  reasonPillStyle,
  resultCardStyle,
  resultHeaderStyle,
  secondaryButtonStyle,
  snippetStyle,
  summaryPanelStyle,
  traceCardStyle,
  tracePreStyle,
  validationComposerStyle,
  workflowDockStyle,
} from "../styles";

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

export function WorkflowPanel({
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
