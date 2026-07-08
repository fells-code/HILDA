import type { CSSProperties } from "react";

export const pageStyle: CSSProperties = {
  height: "100vh",
  overflow: "hidden",
  background: "#0f1115",
  color: "#e5e7eb",
  fontFamily:
    '"IBM Plex Sans", "Avenir Next", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
};

export const shellStyle: CSSProperties = {
  maxWidth: 1560,
  margin: "0 auto",
  height: "100vh",
  padding: "16px 20px 16px 8px",
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "292px minmax(0, 1fr)",
  gap: 16,
  alignItems: "stretch",
};

export const sidebarStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  height: "100%",
  minHeight: 0,
  alignContent: "start",
  overflow: "hidden",
};

export const contentStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  height: "100%",
  minHeight: 0,
  gridTemplateRows: "auto auto minmax(0, 1fr)",
  overflow: "hidden",
};

export const repoHeaderCardStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  borderRadius: 20,
  padding: "16px 18px",
  background: "#171a21",
  color: "#f3f4f6",
  border: "1px solid #262b36",
  boxShadow: "0 12px 28px rgba(0, 0, 0, 0.2)",
};

export const eyebrowStyle: CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 11,
  fontWeight: 700,
  color: "#7c8aa0",
};

export const sidebarHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

export const sidebarBrandRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

export const brandMarkStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "#171d26",
  border: "1px solid #2a3340",
  color: "#dbe4ee",
  fontWeight: 800,
};

export const sidebarBrandTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: "0.06em",
};

export const sidebarBrandSubtitleStyle: CSSProperties = {
  fontSize: 12,
  color: "#7c8aa0",
  marginTop: 2,
};

export const treePanelStyle: CSSProperties = {
  minHeight: 0,
  display: "grid",
  gap: 8,
  padding: "8px 6px 10px",
  borderRadius: 16,
  background: "#12161d",
  border: "1px solid #202733",
};

export const treePanelHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 6px",
};

export const treePanelTitleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#7c8aa0",
};

export const treeListStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  minHeight: 0,
};

export const treeDetailsStyle: CSSProperties = {
  borderRadius: 12,
  overflow: "hidden",
};

export const treeSummaryStyle: CSSProperties = {
  listStyle: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 10px",
  borderRadius: 12,
  cursor: "pointer",
  userSelect: "none",
};

export const treeSummaryLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  fontWeight: 600,
};

export const treeCountStyle: CSSProperties = {
  fontSize: 12,
  color: "#7c8aa0",
};

export const treeChildrenStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: "8px 0 0 26px",
};

export const workspaceActionsRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

export const treeActionButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid #29313d",
  borderRadius: 999,
  background: "#10151c",
  color: "#c8d1dd",
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
};

export const treeHintStyle: CSSProperties = {
  color: "#7c8aa0",
  fontSize: 13,
  padding: "4px 8px 4px 2px",
};

export const repoTreeListStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};

export const repoTreeRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 8,
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: 12,
  padding: "6px 8px",
};

export const repoTreeButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "inherit",
  padding: 0,
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gap: 3,
};

export const repoTreePrimaryStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 600,
  minWidth: 0,
};

export const repoTreeMetaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "#7c8aa0",
  fontSize: 12,
  paddingLeft: 24,
};

export const statusDotStyle: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: 999,
  display: "inline-block",
};

export const iconButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid #2a3340",
  background: "#12161d",
  color: "#c8d1dd",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

export const rowIconButtonStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid transparent",
  background: "transparent",
  color: "#7c8aa0",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #2b3340",
  background: "#11151c",
  color: "#e5e7eb",
  fontSize: 14,
};

export const buttonStyle: CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  background: "#2b3545",
  color: "#f3f4f6",
  fontWeight: 700,
  cursor: "pointer",
};

export const secondaryButtonStyle: CSSProperties = {
  border: "1px solid #2b3340",
  borderRadius: 12,
  padding: "10px 14px",
  background: "#141922",
  color: "#dbe4ee",
  fontWeight: 600,
  cursor: "pointer",
};

export const dangerButtonStyle: CSSProperties = {
  border: "1px solid #4c242b",
  borderRadius: 12,
  padding: "10px 14px",
  background: "#241418",
  color: "#fca5a5",
  fontWeight: 600,
  cursor: "pointer",
};

export const mutedTextStyle: CSSProperties = {
  color: "#8b98aa",
  fontSize: 14,
};

export const errorStyle: CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "#2a1518",
  color: "#fca5a5",
  border: "1px solid #5a232a",
};

export const repoTitleRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  marginTop: 4,
};

export const repoMetaRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

export const heroMetaPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  border: "1px solid #2a3340",
  background: "#11161d",
  color: "#c8d1dd",
  padding: "5px 9px",
  fontSize: 12,
};

export const repoDescriptionStyle: CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  lineHeight: 1.45,
  maxWidth: 920,
  fontSize: 14,
};

export const repoChipRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

export const headerChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  background: "#10151c",
  border: "1px solid #29313d",
  color: "#d6dbe3",
  padding: "5px 9px",
  fontSize: 12,
  fontWeight: 600,
};

export const repoHeaderActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyItems: "end",
  minWidth: 0,
};

export const repoHeaderBodyStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  minWidth: 0,
  flex: 1,
};

export const repoHeaderTopRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

export const repoHeaderTopMetaStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  minWidth: 0,
};

export const repoHeaderSublineStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  color: "#8b98aa",
  fontSize: 12,
};

export const workspaceCanvasStyle: CSSProperties = {
  minHeight: 0,
  height: "100%",
  border: "1px solid #262f3c",
  borderRadius: 24,
  background: "#141922",
  boxShadow: "0 12px 28px rgba(0,0,0,0.16)",
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr) auto",
  overflow: "hidden",
};

export const chatHistoryStyle: CSSProperties = {
  padding: "28px 28px 16px",
  minHeight: 0,
  display: "grid",
  alignContent: "start",
  gap: 18,
  overflowY: "auto",
};

export const chatEmptyStateStyle: CSSProperties = {
  minHeight: 420,
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  gap: 10,
  color: "#d6dbe3",
};

export const chatTimelineStyle: CSSProperties = {
  display: "grid",
  gap: 18,
  alignContent: "start",
};

export const userChatBubbleStyle: CSSProperties = {
  justifySelf: "end",
  width: "min(760px, 100%)",
  borderRadius: 20,
  padding: "16px 18px",
  background: "#1b2330",
  border: "1px solid #324156",
  color: "#eff6ff",
};

export const assistantChatBubbleStyle: CSSProperties = {
  justifySelf: "start",
  width: "min(880px, 100%)",
  borderRadius: 20,
  padding: "16px 18px",
  background: "#10151c",
  border: "1px solid #263140",
  color: "#e5e7eb",
};

export const chatMetaStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#8b98aa",
  marginBottom: 8,
};

export const workflowDockStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  alignContent: "start",
};

export const composerShellStyle: CSSProperties = {
  borderTop: "1px solid #262f3c",
  background: "#11161d",
  padding: 20,
  display: "grid",
  gap: 14,
};

export const quickChipRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

export const quickChipStyle: CSSProperties = {
  ...secondaryButtonStyle,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 13,
};

export const composerRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 14,
  alignItems: "end",
};

export const composerTextareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 92,
  resize: "vertical",
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid #2b3340",
  background: "#0f141b",
  color: "#e5e7eb",
  fontSize: 15,
  lineHeight: 1.6,
};

export const composerSendButtonStyle: CSSProperties = {
  ...buttonStyle,
  minWidth: 120,
  minHeight: 52,
};

export const actionRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

export const validationComposerStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "center",
};

export const localPathBrowserRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "center",
};

export const modalBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(6, 8, 12, 0.66)",
  display: "grid",
  placeItems: "center",
  padding: 24,
  zIndex: 100,
};

export const modalCardStyle: CSSProperties = {
  width: "min(520px, 100%)",
  borderRadius: 18,
  border: "1px solid #2a3340",
  background: "#141922",
  boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
  padding: 20,
  display: "grid",
  gap: 18,
};

export const modalHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

export const modalActionRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

export const iconFrameStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 0,
};

export const summaryPanelStyle: CSSProperties = {
  background: "#131820",
  border: "1px solid #262f3c",
  borderRadius: 14,
  padding: 14,
};

export const overviewSummaryCardStyle: CSSProperties = {
  border: "1px solid #263140",
  borderRadius: 16,
  padding: 16,
  background: "#151a22",
};

export const overviewEyebrowStyle: CSSProperties = {
  ...eyebrowStyle,
  color: "#8b98aa",
  marginBottom: 4,
};

export const overviewPurposeStyle: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "#10151c",
  border: "1px solid #232c38",
  color: "#d6dbe3",
  lineHeight: 1.6,
};

export const detailsStyle: CSSProperties = {
  border: "1px solid #262f3c",
  borderRadius: 14,
  background: "#11161d",
  overflow: "hidden",
};

export const detailsSummaryStyle: CSSProperties = {
  cursor: "pointer",
  padding: 14,
  fontWeight: 700,
  color: "#d6dbe3",
  listStyle: "none",
};

export const detailsContentStyle: CSSProperties = {
  padding: "0 14px 14px",
};

export const metricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

export const metricCardStyle: CSSProperties = {
  border: "1px solid #263140",
  borderRadius: 14,
  padding: 12,
  background: "#131820",
};

export const compactOverviewGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 10,
};

export const compactSectionTitleStyle: CSSProperties = {
  fontWeight: 700,
  marginBottom: 8,
  color: "#e5e7eb",
};

export const sectionCardStyle: CSSProperties = {
  border: "1px solid #262f3c",
  borderRadius: 14,
  padding: 14,
  background: "#11161d",
};

export const sectionItemStyle: CSSProperties = {
  lineHeight: 1.6,
  color: "#d6dbe3",
};

export const resultCardStyle: CSSProperties = {
  border: "1px solid #262f3c",
  borderRadius: 14,
  padding: 14,
  background: "#11161d",
};

export const resultHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 8,
  alignItems: "flex-start",
};

export const reasonListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 8,
};

export const reasonPillStyle: CSSProperties = {
  fontSize: 12,
  color: "#b6c3d6",
  background: "#18202b",
  border: "1px solid #2e3a4a",
  borderRadius: 999,
  padding: "4px 8px",
};

export const snippetStyle: CSSProperties = {
  whiteSpace: "pre-wrap",
  lineHeight: 1.5,
  color: "#d6dbe3",
  background: "#0f141b",
  border: "1px solid #232c38",
  borderRadius: 12,
  padding: 12,
};

export const traceCardStyle: CSSProperties = {
  border: "1px solid #262f3c",
  borderRadius: 12,
  padding: 12,
  background: "#11161d",
};

export const tracePreStyle: CSSProperties = {
  margin: "8px 0 0",
  whiteSpace: "pre-wrap",
  fontSize: 12,
  color: "#b9c3cf",
};

export const approvalCardStyle: CSSProperties = {
  border: "1px solid #262f3c",
  borderRadius: 12,
  padding: 12,
  background: "#11161d",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
};

export const artifactPreStyle: CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  fontSize: 12,
  lineHeight: 1.5,
  color: "#b9c3cf",
  background: "#0f141b",
  border: "1px solid #232c38",
  borderRadius: 12,
  padding: 12,
};
