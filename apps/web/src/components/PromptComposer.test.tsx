import { fireEvent, render, screen } from "@testing-library/react";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { PromptComposer } from "./PromptComposer";

describe("PromptComposer", () => {
  it("fills the textarea from quick prompt chips", () => {
    const onChangeQuestion = vi.fn();

    render(
      <PromptComposer
        question=""
        askingQuestion={false}
        disabled={false}
        onChangeQuestion={onChangeQuestion}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Understand repo" }));

    expect(onChangeQuestion).toHaveBeenCalledWith(
      "What is this repo and how is it structured?",
    );
  });

  it("submits the form and disables send while working", () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });

    render(
      <PromptComposer
        question="Add a new command"
        askingQuestion={true}
        disabled={false}
        onChangeQuestion={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const sendButton = screen.getByRole("button", { name: "Working..." });
    fireEvent.submit(sendButton.closest("form")!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(sendButton).toHaveProperty("disabled", true);
  });
});
