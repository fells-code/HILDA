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
  formatIssueCount,
  getOverviewMetric,
} from "../lib/overview";
import {
  eyebrowStyle,
  headerChipStyle,
  repoChipRowStyle,
  repoDescriptionStyle,
  repoHeaderActionsStyle,
  repoHeaderBodyStyle,
  repoHeaderCardStyle,
  repoHeaderSublineStyle,
  repoHeaderTopMetaStyle,
  repoHeaderTopRowStyle,
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
  onRefresh,
}: {
  workspaceName: string;
  repository: Repository;
  repositoryIndex: RepositoryIndex | null;
  overview: AnalysisResult | null;
  metadata: RepositoryMetadata | null;
  isOverviewLoading: boolean;
  isMetadataLoading: boolean;
  onRefresh: () => void;
}) {
  const languages = extractLanguageNames(overview).slice(0, 3);
  const fileCount = getOverviewMetric(overview, "Files scanned")?.value ?? null;
  const issueCount = formatIssueCount(repository, metadata, isMetadataLoading);

  return (
    <section style={repoHeaderCardStyle}>
      <div style={repoHeaderBodyStyle}>
        <div style={repoHeaderTopRowStyle}>
          <div style={repoHeaderTopMetaStyle}>
            <div style={eyebrowStyle}>{workspaceName} / active repository</div>
            <div style={repoTitleRowStyle}>
              <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.1 }}>
                {repository.name}
              </h2>
              <StatusBadge status={repository.status} />
            </div>
          </div>

          <div style={repoHeaderActionsStyle}>
            <button
              onClick={onRefresh}
              disabled={repository.status !== "indexed"}
              style={secondaryButtonStyle}
            >
              Refresh understanding
            </button>
          </div>
        </div>

        <div style={repoHeaderSublineStyle}>
          <span>
            {repository.provider === "github" ? "GitHub repo" : "Local directory"}
          </span>
          <span>•</span>
          <span>Branch {repository.defaultBranch}</span>
          <span>•</span>
          <span>
            Last indexed{" "}
            {repositoryIndex?.indexedAt
              ? new Date(repositoryIndex.indexedAt).toLocaleString()
              : "not yet"}
          </span>
        </div>

        <p
          style={{
            ...repoDescriptionStyle,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={extractRepositoryDescription(overview, isOverviewLoading)}
        >
          {extractRepositoryDescription(overview, isOverviewLoading)}
        </p>

        <div style={repoChipRowStyle}>
          {languages.map((language) => (
            <span key={`language-${language}`} style={headerChipStyle}>
              {language}
            </span>
          ))}

          {fileCount ? <span style={headerChipStyle}>{fileCount} files</span> : null}

          <span style={headerChipStyle}>Issues {issueCount}</span>
        </div>
      </div>
    </section>
  );
}
