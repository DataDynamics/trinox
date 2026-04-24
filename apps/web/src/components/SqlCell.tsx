import { Tooltip } from "antd";

export const SqlCell = ({ sql }: { sql?: string | null }) => {
  const text = (sql || "").replace(/\s+/g, " ").trim();
  const display = text.length > 120 ? `${text.slice(0, 120)}…` : text;
  return (
    <Tooltip
      title={<pre className="trinox-monospace" style={{ whiteSpace: "pre-wrap" }}>{sql}</pre>}
      overlayStyle={{ maxWidth: 600 }}
    >
      <span className="trinox-monospace ellipsis" style={{ maxWidth: 500, display: "inline-block" }}>
        {display}
      </span>
    </Tooltip>
  );
};
