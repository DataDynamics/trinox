import { Card, Space, Table, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getClusterInfo, getClusterNodes } from "@/api/endpoints";
import type { NodeInfo } from "@/types";

const { Title } = Typography;

export default function Cluster() {
  const { t } = useTranslation();
  const info = useQuery({ queryKey: ["cluster-info"], queryFn: getClusterInfo, refetchInterval: 30_000 });
  const nodes = useQuery({ queryKey: ["cluster-nodes"], queryFn: getClusterNodes, refetchInterval: 10_000 });

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        {t("nav.cluster")}
      </Title>
      <Card title="Info">
        <pre className="trinox-monospace" style={{ maxHeight: 200, overflow: "auto" }}>
          {JSON.stringify(info.data || {}, null, 2)}
        </pre>
      </Card>
      <Card title={t("nav.nodes")}>
        <Table<NodeInfo>
          rowKey="nodeIdentifier"
          size="small"
          loading={nodes.isLoading}
          dataSource={nodes.data || []}
          pagination={false}
          columns={[
            { title: "Node", dataIndex: "nodeIdentifier" },
            { title: "URI", dataIndex: "uri" },
            {
              title: "Version",
              dataIndex: "nodeVersion",
              render: (v: { version: string }) => v?.version,
            },
            {
              title: "State",
              dataIndex: "state",
              render: (s: string, r: NodeInfo) =>
                r.failed ? (
                  <Tag color="error">FAILED</Tag>
                ) : (
                  <Tag color="success">{s || "ACTIVE"}</Tag>
                ),
              width: 120,
            },
            {
              title: "Coordinator",
              dataIndex: "coordinator",
              render: (v?: boolean) => (v ? <Tag>YES</Tag> : "-"),
              width: 110,
            },
            { title: "Heartbeat", dataIndex: "lastHeartbeat", width: 180 },
          ]}
        />
      </Card>
    </Space>
  );
}
