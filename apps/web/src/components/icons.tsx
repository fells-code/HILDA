import React from "react";
import { iconFrameStyle } from "../styles";

function IconFrame({ children }: React.PropsWithChildren) {
  return <span style={iconFrameStyle}>{children}</span>;
}

export function FolderTreeIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h6l2 2h10" />
        <path d="M3 6v12h8" />
        <path d="M13 12h8" />
        <path d="M17 12v6" />
        <path d="M13 18h8" />
      </svg>
    </IconFrame>
  );
}

export function FolderIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 7h6l2 2h10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      </svg>
    </IconFrame>
  );
}

export function GithubIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 19c-4.5 1.5-4.5-2.5-6.5-3m13 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 19.5 4.77 5.07 5.07 0 0 0 19.41 1S18.28.65 15.5 2.48a13.38 13.38 0 0 0-7 0C5.72.65 4.59 1 4.59 1A5.07 5.07 0 0 0 4.5 4.77 5.44 5.44 0 0 0 3 8.5c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 8.5 18.13V22" />
      </svg>
    </IconFrame>
  );
}

export function HardDriveIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 15h.01" />
        <path d="M11 15h6" />
      </svg>
    </IconFrame>
  );
}

export function RefreshIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 2v6h-6" />
        <path d="M3 12a9 9 0 0 1 15.55-6.36L21 8" />
        <path d="M3 22v-6h6" />
        <path d="M21 12a9 9 0 0 1-15.55 6.36L3 16" />
      </svg>
    </IconFrame>
  );
}

export function PlusIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </IconFrame>
  );
}

export function TrashIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    </IconFrame>
  );
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 120ms ease",
        color: "#7c8aa0",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  );
}

export function CloseIcon() {
  return (
    <IconFrame>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </IconFrame>
  );
}
