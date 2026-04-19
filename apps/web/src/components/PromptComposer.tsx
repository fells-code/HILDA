import React from "react";
import {
  composerRowStyle,
  composerSendButtonStyle,
  composerShellStyle,
  composerTextareaStyle,
  quickChipRowStyle,
  quickChipStyle,
} from "../styles";

const QUICK_PROMPTS = [
  {
    label: "Understand repo",
    prompt: "What is this repo and how is it structured?",
  },
  {
    label: "Find implementation",
    prompt: "Where is authentication implemented?",
  },
  {
    label: "Debug issue",
    prompt: "Why is this failing? Help me debug the issue.",
  },
  {
    label: "Plan feature",
    prompt: "How would we add a new feature here?",
  },
] as const;

export function PromptComposer({
  question,
  askingQuestion,
  disabled,
  onChangeQuestion,
  onSubmit,
}: {
  question: string;
  askingQuestion: boolean;
  disabled: boolean;
  onChangeQuestion: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} style={composerShellStyle}>
      <div style={quickChipRowStyle}>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt.label}
            type="button"
            style={quickChipStyle}
            onClick={() => onChangeQuestion(prompt.prompt)}
          >
            {prompt.label}
          </button>
        ))}
      </div>

      <div style={composerRowStyle}>
        <textarea
          value={question}
          onChange={(event) => onChangeQuestion(event.target.value)}
          placeholder="Ask about the repo, debug a failure, plan a feature, or request a change"
          style={composerTextareaStyle}
          disabled={disabled}
          rows={3}
        />
        <button
          type="submit"
          disabled={disabled || askingQuestion}
          style={composerSendButtonStyle}
        >
          {askingQuestion ? "Working..." : "Send"}
        </button>
      </div>
    </form>
  );
}
