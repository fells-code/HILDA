import React from "react";
import { type ChatEntry } from "../types/chat";
import {
  assistantChatBubbleStyle,
  chatEmptyStateStyle,
  chatMetaStyle,
  chatTimelineStyle,
  mutedTextStyle,
  userChatBubbleStyle,
} from "../styles";

function ChatEntryBody({ entry }: { entry: ChatEntry }) {
  if (entry.kind === "system" && entry.title === "Repository overview refreshed") {
    const paragraphs = entry.body
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    return (
      <div style={{ display: "grid", gap: 12 }}>
        {paragraphs.map((paragraph, index) => {
          const separatorIndex = paragraph.indexOf(":");
          const label = separatorIndex > 0 ? paragraph.slice(0, separatorIndex) : null;
          const value =
            separatorIndex > 0 ? paragraph.slice(separatorIndex + 1).trim() : paragraph;

          return (
            <div key={`${entry.id}-${index}`} style={{ lineHeight: 1.7 }}>
              {label ? <strong>{label}: </strong> : null}
              <span>{value}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return <div style={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{entry.body}</div>;
}

export function ChatHistory({ chatHistory }: { chatHistory: ChatEntry[] }) {
  if (chatHistory.length === 0) {
    return (
      <div style={chatEmptyStateStyle}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          Start a conversation with this repository
        </div>
        <div style={{ ...mutedTextStyle, maxWidth: 560 }}>
          Ask HILDA to understand the codebase, locate an implementation, debug a failure,
          or plan a change.
        </div>
      </div>
    );
  }

  return (
    <div style={chatTimelineStyle}>
      {chatHistory.map((entry) => (
        <article
          key={entry.id}
          style={entry.role === "user" ? userChatBubbleStyle : assistantChatBubbleStyle}
        >
          <div style={chatMetaStyle}>
            {entry.role === "user" ? "You" : "HILDA"}
            {entry.title ? ` • ${entry.title}` : ""}
          </div>
          <ChatEntryBody entry={entry} />
        </article>
      ))}
    </div>
  );
}
