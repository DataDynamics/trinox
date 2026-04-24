import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
  message,
} from "antd";
import {
  DownloadOutlined,
  FormatPainterOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import Editor from "@monaco-editor/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format as sqlFormat } from "sql-formatter";
import { saveAs } from "file-saver";
import {
  executeSql,
  exportSql,
  listCatalogs,
  listSchemas,
} from "@/api/endpoints";
import type { SqlExecuteResult } from "@/types";
import { useUiStore } from "@/stores/ui";

const { Title } = Typography;

const DEFAULT_SQL = `-- Trinox SQL Editor\nSELECT 1 AS hello;`;

export default function SqlEditor() {
  const { t } = useTranslation();
  const { theme } = useUiStore();
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [catalog, setCatalog] = useState<string | undefined>();
  const [schema, setSchema] = useState<string | undefined>();
  const [limit, setLimit] = useState<number | null>(1000);
  const [result, setResult] = useState<SqlExecuteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const catalogs = useQuery({ queryKey: ["catalogs"], queryFn: listCatalogs });
  const schemas = useQuery({
    queryKey: ["schemas", catalog],
    queryFn: () => (catalog ? listSchemas(catalog) : Promise.resolve([])),
    enabled: !!catalog,
  });

  const runMut = useMutation({
    mutationFn: () =>
      executeSql({ sql, catalog, schema, limit: limit ?? undefined }),
    onSuccess: (r) => {
      setResult(r);
      setError(null);
    },
    onError: (e: Error) => {
      setError(e.message);
      setResult(null);
    },
  });

  const exportMut = useMutation({
    mutationFn: (kind: "csv" | "json") =>
      exportSql(kind, { sql, catalog, schema, limit: limit ?? undefined }).then(
        (blob) => ({ blob, kind }),
      ),
    onSuccess: ({ blob, kind }) => {
      saveAs(blob, `trinox-result.${kind}`);
    },
    onError: (e: Error) => message.error(e.message),
  });

  const columns = useMemo(() => {
    return (result?.columns || []).map((c, idx) => ({
      title: (
        <span>
          {c.name} <span style={{ opacity: 0.5, fontSize: 11 }}>{c.type}</span>
        </span>
      ),
      dataIndex: idx,
      render: (v: unknown) =>
        v == null ? (
          <span style={{ opacity: 0.4 }}>null</span>
        ) : (
          String(v)
        ),
      width: 180,
      ellipsis: true,
    }));
  }, [result]);

  const rows = useMemo(
    () =>
      (result?.rows || []).map((r, i) => {
        const obj: Record<string, unknown> = { key: i };
        r.forEach((v, j) => (obj[j] = v));
        return obj;
      }),
    [result],
  );

  const handleFormat = () => {
    try {
      setSql(sqlFormat(sql, { language: "trino", keywordCase: "upper" }));
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        {t("nav.editor")}
      </Title>
      <Card>
        <Space wrap style={{ marginBottom: 8 }}>
          <Select
            allowClear
            placeholder={t("common.catalog")}
            style={{ width: 180 }}
            value={catalog}
            onChange={(v) => {
              setCatalog(v);
              setSchema(undefined);
            }}
            options={(catalogs.data || []).map((c) => ({ value: c, label: c }))}
          />
          <Select
            allowClear
            placeholder={t("common.schema")}
            style={{ width: 180 }}
            value={schema}
            onChange={setSchema}
            options={(schemas.data || []).map((c) => ({ value: c, label: c }))}
          />
          <InputNumber
            min={1}
            max={100000}
            value={limit}
            onChange={(v) => setLimit(v)}
            addonBefore={t("editor.limit")}
            style={{ width: 200 }}
          />
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={runMut.isPending}
            onClick={() => runMut.mutate()}
          >
            {t("editor.runQuery")}
          </Button>
          <Button icon={<FormatPainterOutlined />} onClick={handleFormat}>
            {t("common.format")}
          </Button>
          <Button
            icon={<DownloadOutlined />}
            disabled={!result}
            loading={exportMut.isPending && exportMut.variables === "csv"}
            onClick={() => exportMut.mutate("csv")}
          >
            {t("editor.exportCsv")}
          </Button>
          <Button
            icon={<DownloadOutlined />}
            disabled={!result}
            loading={exportMut.isPending && exportMut.variables === "json"}
            onClick={() => exportMut.mutate("json")}
          >
            {t("editor.exportJson")}
          </Button>
        </Space>
        <Editor
          height="360px"
          language="sql"
          value={sql}
          onChange={(v) => setSql(v || "")}
          theme={theme === "dark" ? "vs-dark" : "light"}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            automaticLayout: true,
          }}
        />
      </Card>

      {error && <Alert type="error" showIcon message={t("editor.errorTitle")} description={error} />}

      {result && (
        <Card>
          <Tabs
            items={[
              {
                key: "results",
                label: `Results (${result.row_count})`,
                children: (
                  <Table
                    size="small"
                    rowKey="key"
                    columns={columns as any}
                    dataSource={rows}
                    pagination={{ pageSize: 100 }}
                    scroll={{ x: "max-content", y: 480 }}
                  />
                ),
              },
              {
                key: "stats",
                label: "Stats",
                children: (
                  <pre className="trinox-monospace" style={{ maxHeight: 300, overflow: "auto" }}>
                    {JSON.stringify(result.stats, null, 2)}
                  </pre>
                ),
              },
            ]}
          />
        </Card>
      )}
    </Space>
  );
}
