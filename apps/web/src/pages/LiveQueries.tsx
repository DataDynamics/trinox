import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ReloadOutlined, StopOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { killQuery, listLiveQueries } from "@/api/endpoints";
import type { LiveQuery } from "@/types";
import { QueryStateTag } from "@/components/QueryStateTag";
import { SqlCell } from "@/components/SqlCell";
import { fmtBytes, fmtNumber } from "@/utils/format";

const { Title } = Typography;

export default function LiveQueries() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string | undefined>();
  const [userFilter, setUserFilter] = useState<string | undefined>();
  const [catalogFilter, setCatalogFilter] = useState<string | undefined>();

  const { data = [], isFetching, refetch } = useQuery<LiveQuery[]>({
    queryKey: ["live-queries"],
    queryFn: listLiveQueries,
    refetchInterval: 3000,
  });

  const users = useMemo(
    () =>
      Array.from(new Set(data.map((d) => d.user).filter(Boolean))).map((u) => ({
        label: u,
        value: u,
      })),
    [data],
  );
  const catalogs = useMemo(
    () =>
      Array.from(new Set(data.map((d) => d.catalog).filter(Boolean))).map((c) => ({
        label: c,
        value: c,
      })),
    [data],
  );

  const filtered = data.filter((q) => {
    if (stateFilter && q.state !== stateFilter) return false;
    if (userFilter && q.user !== userFilter) return false;
    if (catalogFilter && q.catalog !== catalogFilter) return false;
    if (search && !q.query?.toLowerCase().includes(search.toLowerCase()) && !q.queryId.includes(search))
      return false;
    return true;
  });

  const killMut = useMutation({
    mutationFn: (id: string) => killQuery(id),
    onSuccess: () => {
      message.success(t("queries.killed"));
      void qc.invalidateQueries({ queryKey: ["live-queries"] });
    },
    onError: (e: Error) => {
      message.error(`${t("queries.killFailed")}: ${e.message}`);
    },
  });

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        {t("nav.liveQueries")}
      </Title>
      <Card>
        <Space wrap style={{ marginBottom: 12 }}>
          <Input.Search
            allowClear
            placeholder={t("common.search")}
            onSearch={setSearch}
            style={{ width: 280 }}
          />
          <Select
            allowClear
            placeholder={t("common.state")}
            style={{ width: 140 }}
            value={stateFilter}
            onChange={setStateFilter}
            options={[
              "QUEUED", "PLANNING", "RUNNING", "FINISHED", "FAILED", "CANCELED",
            ].map((s) => ({ value: s, label: s }))}
          />
          <Select
            allowClear
            placeholder={t("common.user")}
            style={{ width: 160 }}
            value={userFilter}
            onChange={setUserFilter}
            options={users as { label: string; value: string }[]}
          />
          <Select
            allowClear
            placeholder={t("common.catalog")}
            style={{ width: 160 }}
            value={catalogFilter}
            onChange={setCatalogFilter}
            options={catalogs as { label: string; value: string }[]}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isFetching}
          >
            {t("common.refresh")}
          </Button>
          <Tag>{filtered.length} / {data.length}</Tag>
        </Space>
        <Table<LiveQuery>
          rowKey="queryId"
          size="small"
          loading={isFetching && data.length === 0}
          dataSource={filtered}
          pagination={{ pageSize: 50 }}
          scroll={{ x: 1600 }}
          columns={[
            {
              title: t("queries.queryId"),
              dataIndex: "queryId",
              width: 220,
              render: (id: string) => (
                <Link className="trinox-monospace" to={`/queries/${id}`}>
                  {id}
                </Link>
              ),
            },
            {
              title: t("common.state"),
              dataIndex: "state",
              width: 120,
              render: (s: string) => <QueryStateTag state={s} />,
            },
            { title: t("common.user"), dataIndex: "user", width: 120 },
            { title: t("common.catalog"), dataIndex: "catalog", width: 120 },
            { title: "Source", dataIndex: "source", width: 160 },
            { title: t("queries.elapsed"), dataIndex: "elapsedTime", width: 120 },
            { title: t("queries.cpu"), dataIndex: "cpuTime", width: 110 },
            {
              title: t("queries.memory"),
              dataIndex: "peakMemoryBytes",
              width: 120,
              render: (v: number) => fmtBytes(v),
            },
            {
              title: t("queries.rows"),
              dataIndex: "processedRows",
              width: 110,
              render: (v?: number) => fmtNumber(v),
            },
            {
              title: t("queries.progress"),
              dataIndex: "progressPercentage",
              width: 110,
              render: (v?: number) => (v == null ? "-" : `${v.toFixed(1)}%`),
            },
            {
              title: "SQL",
              dataIndex: "query",
              render: (q: string) => <SqlCell sql={q} />,
            },
            {
              title: "",
              key: "actions",
              width: 90,
              fixed: "right",
              render: (_: unknown, r: LiveQuery) => (
                <Popconfirm
                  title={t("queries.confirmKill")}
                  onConfirm={() => killMut.mutate(r.queryId)}
                  disabled={["FINISHED", "FAILED", "CANCELED"].includes(r.state)}
                >
                  <Button
                    danger
                    size="small"
                    icon={<StopOutlined />}
                    disabled={["FINISHED", "FAILED", "CANCELED"].includes(r.state)}
                  >
                    {t("common.kill")}
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
