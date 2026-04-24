import { Tag } from "antd";

const color: Record<string, string> = {
  QUEUED: "default",
  PLANNING: "processing",
  STARTING: "processing",
  RUNNING: "processing",
  FINISHING: "processing",
  FINISHED: "success",
  FAILED: "error",
  CANCELED: "warning",
};

export const QueryStateTag = ({ state }: { state?: string }) => {
  const s = (state || "UNKNOWN").toUpperCase();
  return <Tag color={color[s] || "default"}>{s}</Tag>;
};
