import { useMemo, useState } from "react";
import {
  Card,
  Col,
  DatePicker,
  InputNumber,
  Row,
  Space,
  Statistic,
  Typography,
} from "antd";
import { Column, Line } from "@ant-design/charts";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import dayjs, { Dayjs } from "dayjs";
import { getAnalyticsSummary, getTrends } from "@/api/endpoints";
import { fmtMs, fmtPercent } from "@/utils/format";

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function TrendsAnalytics() {
  const { t } = useTranslation();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(24, "hour"),
    dayjs(),
  ]);
  const [bucket, setBucket] = useState(5);

  const trends = useQuery({
    queryKey: ["trends", range, bucket],
    queryFn: () =>
      getTrends({
        since: range[0].toISOString(),
        until: range[1].toISOString(),
        bucket_minutes: bucket,
      }),
  });
  const summary = useQuery<{ total: number; failed: number; failureRate: number; avgMs: number }>({
    queryKey: ["trends-summary", range],
    queryFn: () =>
      getAnalyticsSummary({
        since: range[0].toISOString(),
        until: range[1].toISOString(),
      }),
  });

  const qpsData = useMemo(
    () =>
      (trends.data || []).flatMap((d) => [
        { time: d.time, category: "total", value: d.total },
        { time: d.time, category: "failed", value: d.failed },
      ]),
    [trends.data],
  );

  const latencyData = useMemo(
    () =>
      (trends.data || []).flatMap((d) => [
        { time: d.time, metric: "p50", value: d.p50Ms ?? 0 },
        { time: d.time, metric: "p95", value: d.p95Ms ?? 0 },
        { time: d.time, metric: "p99", value: d.p99Ms ?? 0 },
        { time: d.time, metric: "avg", value: d.avgMs ?? 0 },
      ]),
    [trends.data],
  );

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        {t("trends.title")}
      </Title>

      <Card>
        <Space wrap>
          <RangePicker
            showTime
            value={range}
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
          />
          <InputNumber
            min={1}
            max={1440}
            value={bucket}
            onChange={(v) => setBucket(v ?? 5)}
            addonBefore={t("trends.bucket")}
            style={{ width: 180 }}
          />
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Total" value={summary.data?.total ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Failed" value={summary.data?.failed ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title={t("dashboard.failureRate")}
              value={fmtPercent(summary.data?.failureRate)}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title={t("dashboard.avgLatency")}
              value={fmtMs(summary.data?.avgMs)}
            />
          </Card>
        </Col>
      </Row>

      <Card title={t("trends.qps")}>
        <Column
          data={qpsData}
          xField="time"
          yField="value"
          seriesField="category"
          isStack={false}
          isGroup
          height={260}
        />
      </Card>

      <Card title={t("trends.latency")}>
        <Line
          data={latencyData}
          xField="time"
          yField="value"
          seriesField="metric"
          smooth
          height={300}
        />
      </Card>
    </Space>
  );
}
