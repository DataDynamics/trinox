import { useMemo, useState } from "react";
import {
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import { Scatter } from "@ant-design/charts";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import dayjs, { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  getHistoryFacets,
  getScatter,
} from "@/api/endpoints";

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function ScatterAnalytics() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(24, "hour"),
    dayjs(),
  ]);
  const [catalog, setCatalog] = useState<string | undefined>();
  const [user, setUser] = useState<string | undefined>();
  const [state, setState] = useState<string | undefined>();
  const [queryType, setQueryType] = useState<string | undefined>();
  const [logScale, setLogScale] = useState(true);
  const [colorBy, setColorBy] = useState<"state" | "catalog" | "user" | "queryType">("state");

  const facets = useQuery({ queryKey: ["history-facets"], queryFn: getHistoryFacets });

  const scatter = useQuery({
    queryKey: ["scatter", range, catalog, user, state, queryType],
    queryFn: () =>
      getScatter({
        since: range[0].toISOString(),
        until: range[1].toISOString(),
        catalog,
        user,
        state,
        query_type: queryType,
        limit: 10000,
      }),
  });

  const data = useMemo(
    () =>
      (scatter.data || []).map((p) => ({
        ...p,
        elapsedMs: p.elapsedMs,
        elapsedDisplay: logScale ? Math.log10(Math.max(1, p.elapsedMs)) : p.elapsedMs,
        createdAt: p.createdAt,
        size: Math.min(20, Math.max(3, Math.log10((p.rows || 1) + 1) * 3)),
      })),
    [scatter.data, logScale],
  );

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        {t("scatter.title")}
      </Title>
      <Card>
        <Space wrap>
          <RangePicker
            showTime
            value={range}
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
          />
          <Select
            allowClear
            style={{ width: 160 }}
            placeholder={t("common.catalog")}
            value={catalog}
            onChange={setCatalog}
            options={(facets.data?.catalogs || []).map((c) => ({ value: c, label: c }))}
          />
          <Select
            allowClear
            style={{ width: 160 }}
            placeholder={t("common.user")}
            value={user}
            onChange={setUser}
            options={(facets.data?.users || []).map((c) => ({ value: c, label: c }))}
          />
          <Select
            allowClear
            style={{ width: 140 }}
            placeholder={t("common.state")}
            value={state}
            onChange={setState}
            options={["FINISHED", "FAILED", "CANCELED"].map((s) => ({ value: s, label: s }))}
          />
          <Select
            allowClear
            style={{ width: 140 }}
            placeholder={t("history.queryType")}
            value={queryType}
            onChange={setQueryType}
            options={["SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "EXPLAIN", "SHOW", "OTHER"].map((s) => ({ value: s, label: s }))}
          />
          <Select
            style={{ width: 160 }}
            value={colorBy}
            onChange={setColorBy}
            options={[
              { value: "state", label: "Color: State" },
              { value: "catalog", label: "Color: Catalog" },
              { value: "user", label: "Color: User" },
              { value: "queryType", label: "Color: Type" },
            ]}
          />
          <span>
            {t("scatter.logScale")}{" "}
            <Switch checked={logScale} onChange={setLogScale} />
          </span>
        </Space>
      </Card>

      <Card>
        <Scatter
          data={data}
          xField="createdAt"
          yField="elapsedDisplay"
          colorField={colorBy}
          sizeField="size"
          height={520}
          shape="circle"
          pointStyle={{ fillOpacity: 0.6, stroke: "#fff" }}
          xAxis={{ type: "time", title: { text: t("scatter.xAxis") } }}
          yAxis={{
            title: {
              text: logScale
                ? `${t("scatter.yAxis")} (log10)`
                : t("scatter.yAxis"),
            },
          }}
          tooltip={{
            customContent: (_: string, items: any[]) => {
              if (!items?.length) return "";
              const d = items[0].data;
              return `
                <div style="padding:8px;font-family:monospace;font-size:12px">
                  <div><b>${d.queryId}</b></div>
                  <div>${d.createdAt}</div>
                  <div>user: ${d.user ?? "-"}</div>
                  <div>catalog: ${d.catalog ?? "-"}</div>
                  <div>state: ${d.state}</div>
                  <div>elapsed: ${d.elapsedMs} ms</div>
                  <div>rows: ${d.rows ?? "-"}</div>
                </div>`;
            },
          }}
          onReady={(plot) => {
            plot.on("element:click", (ev: any) => {
              const id = ev?.data?.data?.queryId;
              if (id) nav(`/queries/${id}`);
            });
          }}
        />
      </Card>
    </Space>
  );
}
