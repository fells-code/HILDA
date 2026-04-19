import { useCallback, useEffect, useState } from "react";
import {
  askRepository,
  createPatch,
  createValidation,
  getTask,
  updateApprovalRequest,
  updatePatchApprovalRequest,
  type AnalysisResult,
  type ApprovalRequest,
  type GeneratedPlan,
  type PatchArtifact,
  type QuestionMatch,
  type TaskTrace,
} from "../lib/api";
import { formatOverviewChatBody } from "../lib/overview";
import type { ChatEntry } from "../types/chat";

export function useRepositoryWorkflow({
  selectedRepositoryId,
  setError,
  onRepositoryOverviewUpdated,
}: {
  selectedRepositoryId: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  onRepositoryOverviewUpdated: (repositoryId: string, overview: AnalysisResult) => void;
}) {
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

  const appendChatEntry = useCallback((entry: Omit<ChatEntry, "id">) => {
    setChatHistory((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...entry,
      },
    ]);
  }, []);

  const handleAskQuestion = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
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
          onRepositoryOverviewUpdated(selectedRepositoryId, response.result);
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
    },
    [
      appendChatEntry,
      onRepositoryOverviewUpdated,
      question,
      selectedRepositoryId,
      setError,
    ],
  );

  const handlePlanApproval = useCallback(
    async (status: "approved" | "rejected") => {
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
    },
    [latestPlanApprovalId, latestPlanTaskId, setError],
  );

  const handleCreatePatch = useCallback(async () => {
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
  }, [
    appendChatEntry,
    latestPlan,
    latestPlanApprovals,
    latestPlanMatches,
    latestPlanTaskId,
    selectedRepositoryId,
    setError,
  ]);

  const handlePatchApproval = useCallback(
    async (status: "approved" | "rejected") => {
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
    },
    [latestPatchApprovalId, latestPatchTaskId, setError],
  );

  const handleRunValidation = useCallback(async () => {
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
  }, [
    appendChatEntry,
    latestPatchTaskId,
    selectedRepositoryId,
    setError,
    validationTestCommand,
  ]);

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

  return {
    question,
    setQuestion,
    askingQuestion,
    questionMatches,
    questionAnswer,
    latestTaskId,
    taskTraces,
    latestPlan,
    latestPlanTaskId,
    latestPlanApprovals,
    latestPlanTraces,
    latestPlanMatches,
    latestPatchTaskId,
    latestPatchApprovals,
    latestPatchArtifacts,
    latestPatchTraces,
    latestValidationTaskId,
    latestValidationArtifacts,
    latestValidationTraces,
    validationTestCommand,
    setValidationTestCommand,
    activeWorkflowPanel,
    chatHistory,
    creatingPatch,
    runningValidation,
    handleAskQuestion,
    handlePlanApproval,
    handleCreatePatch,
    handlePatchApproval,
    handleRunValidation,
  };
}
