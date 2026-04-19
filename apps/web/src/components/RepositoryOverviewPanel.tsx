import React from "react";
import type { AnalysisResult } from "../lib/api";
import {
  compactOverviewGridStyle,
  compactSectionTitleStyle,
  detailsContentStyle,
  detailsStyle,
  detailsSummaryStyle,
  metricCardStyle,
  metricGridStyle,
  mutedTextStyle,
  overviewEyebrowStyle,
  overviewPurposeStyle,
  overviewSummaryCardStyle,
  sectionCardStyle,
  sectionItemStyle,
  summaryPanelStyle,
} from "../styles";

export function RepositoryOverviewPanel({
  overview,
  summary,
}: {
  overview: AnalysisResult;
  summary: string | null;
}) {
  const sections = overview.sections ?? [];
  const purposeSection = sections.find((section) => section.title === "Purpose");
  const architectureSection = sections.find(
    (section) => section.title === "Architecture",
  );
  const toolingSection = sections.find(
    (section) => section.title === "Frameworks and tooling",
  );
  const testingSection = sections.find(
    (section) => section.title === "Testing and coverage",
  );
  const issuesSection = sections.find(
    (section) => section.title === "Observed gaps and issues",
  );
  const milestonesSection = sections.find(
    (section) => section.title === "Suggested milestones",
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={overviewSummaryCardStyle}>
        <div>
          <div style={overviewEyebrowStyle}>Repo snapshot</div>
          <strong style={{ fontSize: 18 }}>{overview.title}</strong>
        </div>
        <div style={{ marginTop: 10, lineHeight: 1.7 }}>{overview.answer}</div>
        {purposeSection?.items[0] ? (
          <div style={overviewPurposeStyle}>{purposeSection.items[0]}</div>
        ) : null}
      </div>

      {overview.metrics && overview.metrics.length > 0 ? (
        <div style={metricGridStyle}>
          {overview.metrics.map((metric) => (
            <article key={`${metric.label}-${metric.value}`} style={metricCardStyle}>
              <div style={{ ...mutedTextStyle, marginBottom: 4 }}>{metric.label}</div>
              <div style={{ fontWeight: 700 }}>{metric.value}</div>
            </article>
          ))}
        </div>
      ) : null}

      <div style={compactOverviewGridStyle}>
        {architectureSection?.items.length ? (
          <article style={sectionCardStyle}>
            <div style={compactSectionTitleStyle}>Architecture</div>
            <div style={{ display: "grid", gap: 6 }}>
              {architectureSection.items.slice(0, 2).map((item, index) => (
                <div key={`architecture-${index}-${item}`} style={sectionItemStyle}>
                  {item}
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {toolingSection?.items.length ? (
          <article style={sectionCardStyle}>
            <div style={compactSectionTitleStyle}>Tooling</div>
            <div style={{ display: "grid", gap: 6 }}>
              {toolingSection.items.slice(0, 2).map((item, index) => (
                <div key={`tooling-${index}-${item}`} style={sectionItemStyle}>
                  {item}
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {testingSection?.items.length ? (
          <article style={sectionCardStyle}>
            <div style={compactSectionTitleStyle}>Testing</div>
            <div style={{ display: "grid", gap: 6 }}>
              {testingSection.items.slice(0, 2).map((item, index) => (
                <div key={`testing-${index}-${item}`} style={sectionItemStyle}>
                  {item}
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </div>

      <div style={compactOverviewGridStyle}>
        {issuesSection?.items.length ? (
          <article style={sectionCardStyle}>
            <div style={compactSectionTitleStyle}>Top gaps</div>
            <div style={{ display: "grid", gap: 6 }}>
              {issuesSection.items.slice(0, 3).map((item, index) => (
                <div key={`issue-${index}-${item}`} style={sectionItemStyle}>
                  {item}
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {milestonesSection?.items.length ? (
          <article style={sectionCardStyle}>
            <div style={compactSectionTitleStyle}>Suggested next steps</div>
            <div style={{ display: "grid", gap: 6 }}>
              {milestonesSection.items.slice(0, 3).map((item, index) => (
                <div key={`milestone-${index}-${item}`} style={sectionItemStyle}>
                  {item}
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </div>

      {sections.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          <details style={detailsStyle}>
            <summary style={detailsSummaryStyle}>Full repository overview</summary>
            <div style={detailsContentStyle}>
              <div style={{ display: "grid", gap: 10 }}>
                {sections.map((section) => (
                  <article key={section.title} style={sectionCardStyle}>
                    <div style={compactSectionTitleStyle}>{section.title}</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {section.items.map((item, index) => (
                        <div
                          key={`${section.title}-${index}-${item}`}
                          style={sectionItemStyle}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </details>

          {overview.evidence.length > 0 ? (
            <details style={detailsStyle}>
              <summary style={detailsSummaryStyle}>Evidence signals</summary>
              <div style={detailsContentStyle}>
                <div style={{ display: "grid", gap: 8 }}>
                  {overview.evidence.map((item, index) => (
                    <article
                      key={`${item.label}-${item.value}-${index}`}
                      style={sectionCardStyle}
                    >
                      <div style={{ ...mutedTextStyle, marginBottom: 4 }}>
                        {item.label}
                      </div>
                      <div style={sectionItemStyle}>{item.value}</div>
                    </article>
                  ))}
                </div>
              </div>
            </details>
          ) : null}

          {summary ? (
            <details style={detailsStyle}>
              <summary style={detailsSummaryStyle}>Index summary</summary>
              <div style={detailsContentStyle}>
                <div style={summaryPanelStyle}>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                      color: "#d6dbe3",
                    }}
                  >
                    {summary}
                  </div>
                </div>
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
