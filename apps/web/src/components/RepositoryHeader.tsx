import React from "react";
import { StatusBadge } from "./StatusBadge";
import type {
  AnalysisResult,
  Repository,
  RepositoryIndex,
  RepositoryMetadata,
} from "../lib/api";
import {
  extractLanguageNames,
  extractRepositoryDescription,
  extractToolingNames,
  formatIssueCount,
  getOverviewMetric,
} from "../lib/overview";
import {
  dangerButtonStyle,
  eyebrowStyle,
  headerChipStyle,
  heroMetaPillStyle,
  repoChipRowStyle,
  repoDescriptionStyle,
  repoHeaderActionsStyle,
  repoHeaderCardStyle,
  repoMetaRowStyle,
  repoTitleRowStyle,
  secondaryButtonStyle,
} from "../styles";

export function RepositoryHeader({
  workspaceName,
  repository,
  repositoryIndex,
  overview,
  metadata,
  isOverviewLoading,
  isMetadataLoading,
  isDeleting,
  onDelete,
  onRefresh,
}: {
  workspaceName: string;
  repository: Repository;
  repositoryIndex: RepositoryIndex | null;
  overview: AnalysisResult | null;
  metadata: RepositoryMetadata | null;
  isOverviewLoading: boolean;
  isMetadataLoading: boolean;
  isDeleting: boolean;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  return (
    <section style={repoHeaderCardStyle}>
      <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
        <div>
          <div style={eyebrowStyle}>{workspaceName} / active repository</div>
          <div style={repoTitleRowStyle}>
            <h2 style={{ margin: 0, fontSize: 30 }}>{repository.name}</h2>
            <StatusBadge status={repository.status} />
          </div>
        </div>

        <div style={repoMetaRowStyle}>
          <span style={heroMetaPillStyle}>
            {repository.provider === "github" ? "GitHub repo" : "Local directory"}
          </span>
          <span style={heroMetaPillStyle}>Branch {repository.defaultBranch}</span>
          <span style={heroMetaPillStyle}>
            Last indexed{" "}
            {repositoryIndex?.indexedAt
              ? new Date(repositoryIndex.indexedAt).toLocaleString()
              : "not yet"}
          </span>
        </div>

        <p style={repoDescriptionStyle}>
          {extractRepositoryDescription(overview, isOverviewLoading)}
        </p>

        <div style={repoChipRowStyle}>
          {extractLanguageNames(overview).map((language) => (
            <span key={`language-${language}`} style={headerChipStyle}>
              {language}
            </span>
          ))}

          {getOverviewMetric(overview, "Files scanned") ? (
            <span style={headerChipStyle}>
              {getOverviewMetric(overview, "Files scanned")?.value} files
            </span>
          ) : null}

          {extractToolingNames(overview).map((tool) => (
            <span key={`tool-${tool}`} style={headerChipStyle}>
              {tool}
            </span>
          ))}

          <span style={headerChipStyle}>
            Issues {formatIssueCount(repository, metadata, isMetadataLoading)}
          </span>
        </div>
      </div>

      <div style={repoHeaderActionsStyle}>
        <button onClick={onDelete} disabled={isDeleting} style={dangerButtonStyle}>
          {isDeleting ? "Deleting..." : "Delete repository"}
        </button>
        <button
          onClick={onRefresh}
          disabled={repository.status !== "indexed"}
          style={secondaryButtonStyle}
        >
          Refresh repo context
        </button>
      </div>
    </section>
  );
}
