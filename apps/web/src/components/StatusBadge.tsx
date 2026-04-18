interface StatusBadgeProps {
  status: string;
}

function getStatusStyles(status: string) {
  switch (status) {
    case "indexed":
      return {
        background: "#14261f",
        color: "#86efac",
      };
    case "syncing":
      return {
        background: "#152235",
        color: "#93c5fd",
      };
    case "queued":
      return {
        background: "#2b2414",
        color: "#fcd34d",
      };
    case "failed":
      return {
        background: "#2a1518",
        color: "#fca5a5",
      };
    default:
      return {
        background: "#202733",
        color: "#cbd5e1",
      };
  }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = getStatusStyles(status);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "capitalize",
        ...styles,
      }}
    >
      {status}
    </span>
  );
}
