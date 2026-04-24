import { useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import {
  getHistoryFacets,
  listHistory,
  type HistoryFilters,
} from "@/api/endpoints";
import type { HistoryItem } from "@/types";
import { QueryStateTag } from "@/components/QueryStateTag";
import { SqlCell } from "@/components/SqlCell";
import { fmtBytes, fmtDate, fmtMs, fmtNumber } from "@/utils/format";

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function QueryHistory() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs().subtract(24, "hour"),
    dayjs(),
  ]);

  const facets = useQuery({ queryKey: ["history-facets"], queryFn: getHistoryFacets });

  const params: HistoryFilters = {
    ...filters,
    page,
    page_size: pageSize,
    since: range?.[0]?.toISOString(),
    until: range?.[1]?.toISOString(),
  };

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["history", params],
    queryFn: () => listHistory(params),
  });

  const update = (patch: Partial<HistoryFilters>) => {
    setPage(1);
    setFilters((f) => ({ ...f, ...patch }));
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        {t("history.title")}
      </Title>
      <Card>
        <Space wrap>
          <RangePicker
            showTime
            value={range ?? undefined}
            onChange={(v) => setRange(v && v[0] && v[1] ? [v[0], v[1]] : null)}
          />
          <Input.Search
            allowClear
            style={{ width: 280 }}
            placeholder={t("history.searchSql")}
            onSearch={(v) => update({ search: v || undefined })}
          />
          <Select
            allowClear
            placeholder={t("common.state")}
            style={{ width: 140 }}
            onChange={(v) => update({ state: v })}
            options={["FINISHED", "FAILED", "CANCELED", "RUNNING", "QUEUED"].map((s) => ({ value: s, label: s }))}
          />
          <Select
            allowClear
            placeholder={t("common.user")}
            style={{ width: 160 }}
            onChange={(v) => update({ user: v })}
            options={(facets.data?.users || []).map((u) => ({ value: u, label: u }))}
          />
          <Select
            allowClear
            placeholder={t("common.catalog")}
            style={{ width: 160 }}
            onChange={(v) => update({ catalog: v })}
            options={(facets.data?.catalogs || []).map((c) => ({ value: c, label: c }))}
          />
          <Select
            allowClear
            placeholder={t("history.queryType")}
            style={{ width: 140 }}
            onChange={(v) => update({ query_type: v })}
            options={["SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "EXPLAIN", "SHOW", "OTHER"].map((s) => ({ value: s, label: s }))}
          />
          <InputNumber
            min={0}
            placeholder={t("history.minElapsed")}
            onChange={(v) => update({ min_elapsed_ms: (v as number) ?? undefined })}
            style={{ width: 170 }}
          />
          <InputNumber
            min={0}
            placeholder={t("history.maxElapsed")}
            onChange={(v) => update({ max_elapsed_ms: (v as number) ?? undefined })}
            style={{ width: 170 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching}>
            {t("common.refresh")}
          </Button>
        </Space>
      </Card>
      <Card>
        <Table<HistoryItem>
          rowKey="query_id"
          size="small"
          loading={isFetching}
          dataSource={data?.items || []}
          pagination={{
            current: page,
            pageSize,
            total: data?.meta.total ?? 0,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: 1600 }}
          columns={[
            {
              title: t("queries.queryId"),
              dataIndex: "query_id",
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
              width: 110,
              render: (s: string) => <QueryStateTag state={s} />,
            },
            { title: t("common.user"), dataIndex: "user", width: 120 },
            { title: t("common.catalog"), dataIndex: "catalog", width: 120 },
            { title: "Type", dataIndex: "query_type", width: 100 },
            {
              title: "Created",
              dataIndex: "created_at",
              width: 170,
              render: fmtDate,
            },
            {
              title: t("queries.elapsed"),
              dataIndex: "elapsed_time_ms",
              width: 120,
              render: (v?: number) => fmtMs(v),
            },
            {
              title: t("queries.memory"),
              dataIndex: "peak_memory_bytes",
              width: 120,
              render: (v?: number) => fmtBytes(v),
            },
            {
              title: "Rows",
              dataIndex: "processed_rows",
              width: 110,
              render: (v?: number) => fmtNumber(v),
            },
            {
              title: "SQL",
              dataIndex: "sql_text",
              render: (q: string) => <SqlCell sql={q} />,
            },
          ]}
        />
      </Card>
    </Space>
  );
}
