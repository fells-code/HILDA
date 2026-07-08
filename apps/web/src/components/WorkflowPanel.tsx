import React from "react";
import { PlanSection } from "./PlanSection";
import type { GeneratedPlan, QuestionMatch, TaskTrace } from "../lib/api";
import {
  detailsContentStyle,
  detailsStyle,
  detailsSummaryStyle,
  mutedTextStyle,
  reasonListStyle,
  reasonPillStyle,
  resultCardStyle,
  resultHeaderStyle,
  snippetStyle,
  summaryPanelStyle,
  traceCardStyle,
  tracePreStyle,
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

export function WorkflowPanel({
  activeWorkflowPanel,
  questionAnswer,
  questionMatches,
  latestTaskId,
  taskTraces,
  latestPlan,
  latestPlanMatches,
  latestPlanTaskId,
  latestPlanTraces,
}: {
  activeWorkflowPanel: "idle" | "question" | "plan" | "patch" | "validation";
  questionAnswer: string;
  questionMatches: QuestionMatch[];
  latestTaskId: string;
  taskTraces: TaskTrace[];
  latestPlan: GeneratedPlan | null;
  latestPlanMatches: QuestionMatch[];
  latestPlanTaskId: string;
  latestPlanTraces: TaskTrace[];
}) {
  if (activeWorkflowPanel === "idle" && !questionAnswer && !latestPlan) {
    return null;
  }

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
          <summary style={detailsSummaryStyle}>Suggested implementation context</summary>
          <div style={detailsContentStyle}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={summaryPanelStyle}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {latestPlan.summary}
                </div>
                <div style={mutedTextStyle}>
                  HILDA interpreted this as an implementation-oriented question. The
                  outline is shown here for context only.
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

              {latestPlanMatches.length > 0 ? (
                <details style={detailsStyle}>
                  <summary style={detailsSummaryStyle}>Supporting evidence</summary>
                  <div style={detailsContentStyle}>
                    <MatchList
                      title="Evidence used to build this outline"
                      matches={latestPlanMatches}
                    />
                  </div>
                </details>
              ) : null}

              {latestPlanTraces.length > 0 ? (
                <details style={detailsStyle}>
                  <summary style={detailsSummaryStyle}>
                    Trace {latestPlanTaskId ? `• ${latestPlanTaskId}` : ""}
                  </summary>
                  <div style={detailsContentStyle}>
                    <TraceList title="Task trace" traces={latestPlanTraces} />
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
