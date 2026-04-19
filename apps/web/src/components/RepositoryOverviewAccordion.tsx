import React from "react";
import type { AnalysisResult, Repository, RepositoryIndex } from "../lib/api";
import {
  detailsContentStyle,
  detailsStyle,
  detailsSummaryStyle,
  mutedTextStyle,
} from "../styles";
import { RepositoryOverviewPanel } from "./RepositoryOverviewPanel";

export function RepositoryOverviewAccordion({
  repository,
  repositoryIndex,
  overview,
  isLoading,
}: {
  repository: Repository;
  repositoryIndex: RepositoryIndex | null;
  overview: AnalysisResult | null;
  isLoading: boolean;
}) {
  return (
    <details style={detailsStyle}>
      <summary style={detailsSummaryStyle}>Full repository overview</summary>
      <div style={detailsContentStyle}>
        {repository.status !== "indexed" ? (
          <p style={mutedTextStyle}>
            This repository needs to finish indexing before HILDA can build a useful
            overview.
          </p>
        ) : isLoading ? (
          <p style={mutedTextStyle}>Building repository overview...</p>
        ) : overview ? (
          <RepositoryOverviewPanel
            overview={overview}
            summary={repositoryIndex?.summary ?? null}
          />
        ) : (
          <p style={mutedTextStyle}>
            Overview not loaded yet. HILDA will fetch it automatically.
          </p>
        )}
      </div>
    </details>
  );
}
