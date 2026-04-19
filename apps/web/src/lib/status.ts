export function getStatusDotColor(status: string) {
  switch (status) {
    case "indexed":
      return "#4ade80";
    case "syncing":
      return "#60a5fa";
    case "queued":
      return "#facc15";
    case "failed":
      return "#f87171";
    default:
      return "#94a3b8";
  }
}
