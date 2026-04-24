import { Card, Col, Row, Statistic, Table, Progress, Space, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Line, Pie } from "@ant-design/charts";
import dayjs from "dayjs";
import {
  getAnalyticsSummary,
  getClusterOverview,
  getTopUsers,
  getTrends,
  listLiveQueries,
} from "@/api/endpoints";
import { fmtBytes, fmtMs, fmtNumber, fmtPercent } from "@/utils/format";
import { QueryStateTag } from "@/components/QueryStateTag";
import { SqlCell } from "@/components/SqlCell";
import { Link } from "react-router-dom";
import type { LiveQuery } from "@/types";

const { Title } = Typography;

export default function Dashboard() {
  const { t } = useTranslation();
  const since = dayjs().subtract(1, "hour").toISOString();
  const until = dayjs().toISOString();

  const overview = useQuery({
    queryKey: ["cluster-overview"],
    queryFn: getClusterOverview,
    refetchInterval: 5000,
  });

  const live = useQuery<LiveQuery[]>({
    queryKey: ["live-queries"],
    queryFn: listLiveQueries,
    refetchInterval: 5000,
  });

  const summary = useQuery({
    queryKey: ["analytics-summary", since, until],
    queryFn: () => getAnalyticsSummary({ since, until }),
    refetchInterval: 30_000,
  });

  const trends = useQuery({
    queryKey: ["trends-dashboard", since, until],
    queryFn: () => getTrends({ since, until, bucket_minutes: 1 }),
    refetchInterval: 30_000,
  });

  const topUsers = useQuery({
    queryKey: ["top-users", since, until],
    queryFn: () => getTopUsers({ since, until, limit: 10 }),
    refetchInterval: 30_000,
  });

  const o = overview.data || ({} as Record<string, number>);
  const ov = (k: string) => (o as Record<string, number>)[k];

  const longRunning = (live.data || [])
    .filter((q) => q.state === "RUNNING")
    .sort((a, b) => (b.elapsedTime || "").localeCompare(a.elapsedTime || ""))
    .slice(0, 10);

  const catalogData = (() => {
    const counts = new Map<string, number>();
    for (const q of live.data || []) {
      const k = q.catalog || "(none)";
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([type, value]) => ({ type, value }));
  })();

  const trendData = (trends.data || []).flatMap((d) => [
    { time: d.time, category: "total", value: d.total },
    { time: d.time, category: "failed", value: d.failed },
  ]);

  const memoryUsed = ov("reservedMemory") || 0;
  const memoryTotal = Math.max(memoryUsed, 1);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        {t("nav.dashboard")}
      </Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title={t("dashboard.running")}
              value={ov("runningQueries") ?? 0}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title={t("dashboard.queued")}
              value={ov("queuedQueries") ?? 0}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title={t("dashboard.failureRate")}
              value={fmtPercent((summary.data as any)?.failureRate)}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title={t("dashboard.avgLatency")}
              value={fmtMs((summary.data as any)?.avgMs)}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title={t("dashboard.activeNodes")}
              value={ov("activeWorkers") ?? 0}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Running Drivers"
              value={fmtNumber(ov("runningDrivers"))}
            />
          </Card>
        </Col>
        <Col xs={12} md={12}>
          <Card title={t("dashboard.memoryUsage")}>
            <Progress
              percent={Number(
                ((memoryUsed / memoryTotal) * 100).toFixed(1),
              )}
              status="active"
            />
            <div style={{ marginTop: 8 }}>{fmtBytes(memoryUsed)}</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={t("dashboard.queryRate")}>
            <Line
              data={trendData}
              xField="time"
              yField="value"
              seriesField="category"
              height={260}
              smooth
              animation={false}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={t("dashboard.catalogDistribution")}>
            <Pie
              data={catalogData}
              angleField="value"
              colorField="type"
              radius={0.9}
              height={260}
              label={{ type: "inner", content: "{percentage}" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={t("dashboard.topLongRunning")}>
            <Table
              size="small"
              rowKey="queryId"
              pagination={false}
              dataSource={longRunning}
              columns={[
                {
                  title: t("queries.queryId"),
                  dataIndex: "queryId",
                  render: (id: string) => (
                    <Link to={`/queries/${id}`} className="trinox-monospace">
                      {id}
                    </Link>
                  ),
                  width: 220,
                },
                {
                  title: t("common.state"),
                  dataIndex: "state",
                  render: (s: string) => <QueryStateTag state={s} />,
                  width: 110,
                },
                { title: t("common.user"), dataIndex: "user", width: 120 },
                { title: t("queries.elapsed"), dataIndex: "elapsedTime", width: 120 },
                { title: "SQL", dataIndex: "query", render: (q: string) => <SqlCell sql={q} /> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Top Users (1h)">
            <Table
              size="small"
              rowKey="user"
              pagination={false}
              dataSource={topUsers.data || []}
              columns={[
                { title: t("common.user"), dataIndex: "user" },
                { title: "Total", dataIndex: "total", width: 80 },
                {
                  title: "Avg",
                  dataIndex: "avgMs",
                  render: (v: number) => fmtMs(v),
                  width: 100,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
