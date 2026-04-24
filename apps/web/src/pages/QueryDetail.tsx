import { Card, Descriptions, Space, Spin, Tabs, Typography } from "antd";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Editor from "@monaco-editor/react";
import { getQueryDetail } from "@/api/endpoints";
import { QueryStateTag } from "@/components/QueryStateTag";
import { useUiStore } from "@/stores/ui";

const { Title, Paragraph } = Typography;

export default function QueryDetail() {
  const { queryId = "" } = useParams();
  const { theme } = useUiStore();
  const { data, isLoading } = useQuery({
    queryKey: ["query-detail", queryId],
    queryFn: () => getQueryDetail(queryId),
    refetchInterval: 3000,
    enabled: !!queryId,
  });

  if (isLoading) return <Spin />;
  const q = data || {};
  const stats = q.queryStats || q.stats || {};
  const session = q.session || {};

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        <span className="trinox-monospace">{queryId}</span> <QueryStateTag state={q.state} />
      </Title>
      <Card>
        <Descriptions size="small" column={{ xs: 1, md: 2, lg: 3 }} bordered>
          <Descriptions.Item label="User">{session.user || q.user}</Descriptions.Item>
          <Descriptions.Item label="Source">{session.source || "-"}</Descriptions.Item>
          <Descriptions.Item label="Catalog">{session.catalog || "-"}</Descriptions.Item>
          <Descriptions.Item label="Schema">{session.schema || "-"}</Descriptions.Item>
          <Descriptions.Item label="Query Type">{q.queryType || "-"}</Descriptions.Item>
          <Descriptions.Item label="Elapsed">{stats.elapsedTime || "-"}</Descriptions.Item>
          <Descriptions.Item label="Queued">{stats.queuedTime || "-"}</Descriptions.Item>
          <Descriptions.Item label="Execution">{stats.executionTime || "-"}</Descriptions.Item>
          <Descriptions.Item label="CPU">{stats.totalCpuTime || "-"}</Descriptions.Item>
          <Descriptions.Item label="Peak memory">{stats.peakMemoryBytes ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Processed rows">{stats.processedRows ?? stats.totalRows ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Progress">
            {stats.progressPercentage != null ? `${stats.progressPercentage.toFixed(1)}%` : "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs
          items={[
            {
              key: "sql",
              label: "SQL",
              children: (
                <Editor
                  height="300px"
                  language="sql"
                  value={q.query || ""}
                  theme={theme === "dark" ? "vs-dark" : "light"}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                  }}
                />
              ),
            },
            {
              key: "stages",
              label: "Stages",
              children: (
                <pre className="trinox-monospace" style={{ maxHeight: 400, overflow: "auto" }}>
                  {JSON.stringify(q.outputStage || q.stages || {}, null, 2)}
                </pre>
              ),
            },
            {
              key: "stats",
              label: "Stats",
              children: (
                <pre className="trinox-monospace" style={{ maxHeight: 400, overflow: "auto" }}>
                  {JSON.stringify(stats, null, 2)}
                </pre>
              ),
            },
            {
              key: "session",
              label: "Session",
              children: (
                <pre className="trinox-monospace" style={{ maxHeight: 400, overflow: "auto" }}>
                  {JSON.stringify(session, null, 2)}
                </pre>
              ),
            },
            q.failureInfo && {
              key: "error",
              label: "Error",
              children: (
                <Paragraph>
                  <pre className="trinox-monospace" style={{ maxHeight: 400, overflow: "auto", color: "#ff4d4f" }}>
                    {JSON.stringify(q.failureInfo, null, 2)}
                  </pre>
                </Paragraph>
              ),
            },
          ].filter(Boolean) as any}
        />
      </Card>
    </Space>
  );
}
