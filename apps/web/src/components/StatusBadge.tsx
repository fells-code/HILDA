interface StatusBadgeProps {
  status: string;
}

function getStatusStyles(status: string) {
  switch (status) {
    case "indexed":
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    case "syncing":
      return {
        background: "#dbeafe",
        color: "#1d4ed8",
      };
    case "queued":
      return {
        background: "#fef3c7",
        color: "#92400e",
      };
    case "failed":
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };
    default:
      return {
        background: "#e5e7eb",
        color: "#374151",
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
