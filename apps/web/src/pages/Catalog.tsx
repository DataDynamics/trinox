import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Col,
  Empty,
  Input,
  Row,
  Space,
  Spin,
  Table,
  Tabs,
  Tree,
  Typography,
} from "antd";
import type { DataNode } from "antd/es/tree";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Editor from "@monaco-editor/react";
import {
  describeTable,
  listCatalogs,
  listSchemas,
  listTables,
  previewTable,
  tableDDL,
} from "@/api/endpoints";
import { useUiStore } from "@/stores/ui";

const { Title, Paragraph } = Typography;

interface NodeData extends DataNode {
  kind: "catalog" | "schema" | "table";
  catalog?: string;
  schema?: string;
  table?: string;
}

export default function Catalog() {
  const { t } = useTranslation();
  const { theme } = useUiStore();

  const catalogs = useQuery({ queryKey: ["catalogs"], queryFn: listCatalogs });
  const [treeData, setTreeData] = useState<NodeData[]>([]);
  const [selected, setSelected] = useState<NodeData | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (catalogs.data) {
      setTreeData(
        catalogs.data.map((c) => ({
          key: `c:${c}`,
          title: c,
          kind: "catalog",
          catalog: c,
        })),
      );
    }
  }, [catalogs.data]);

  const filtered = useMemo(() => {
    if (!search) return treeData;
    const q = search.toLowerCase();
    return treeData
      .map((cat) => {
        const children = (cat.children || []) as NodeData[];
        const matchedSchemas = children
          .map((sch) => {
            const tables = (sch.children || []) as NodeData[];
            const matched = tables.filter((tb) =>
              String(tb.title).toLowerCase().includes(q),
            );
            if (matched.length || String(sch.title).toLowerCase().includes(q)) {
              return { ...sch, children: matched.length ? matched : sch.children };
            }
            return null;
          })
          .filter(Boolean) as NodeData[];
        if (
          matchedSchemas.length ||
          String(cat.title).toLowerCase().includes(q)
        )
          return { ...cat, children: matchedSchemas.length ? matchedSchemas : cat.children };
        return null;
      })
      .filter(Boolean) as NodeData[];
  }, [treeData, search]);

  const onLoadData = async (node: NodeData) => {
    if (node.kind === "catalog") {
      const schemas = await listSchemas(node.catalog!);
      setTreeData((tree) =>
        patchChildren(tree, node.key as string,
          schemas.map((s) => ({
            key: `s:${node.catalog}.${s}`,
            title: s,
            kind: "schema",
            catalog: node.catalog,
            schema: s,
          })),
        ),
      );
    } else if (node.kind === "schema") {
      const tables = await listTables(node.catalog!, node.schema!);
      setTreeData((tree) =>
        patchChildren(tree, node.key as string,
          tables.map((tb) => ({
            key: `t:${node.catalog}.${node.schema}.${tb}`,
            title: tb,
            kind: "table",
            isLeaf: true,
            catalog: node.catalog,
            schema: node.schema,
            table: tb,
          })),
        ),
      );
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        {t("catalog.title")}
      </Title>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card size="small" style={{ height: "calc(100vh - 180px)" }}>
            <Input.Search
              placeholder={t("common.search")}
              allowClear
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            {catalogs.isLoading ? (
              <Spin />
            ) : (
              <Tree
                loadData={(n) => onLoadData(n as NodeData)}
                treeData={filtered}
                onSelect={(_, info) => setSelected(info.node as NodeData)}
                style={{ height: "calc(100vh - 260px)", overflow: "auto" }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={16}>
          {selected?.kind === "table" ? (
            <TableDetail
              catalog={selected.catalog!}
              schema={selected.schema!}
              table={selected.table!}
              monacoTheme={theme === "dark" ? "vs-dark" : "light"}
            />
          ) : (
            <Card>
              <Empty description={t("common.noData")} />
            </Card>
          )}
        </Col>
      </Row>
    </Space>
  );
}

function patchChildren(
  tree: NodeData[],
  key: string,
  children: NodeData[],
): NodeData[] {
  return tree.map((n) => {
    if (n.key === key) return { ...n, children };
    if (n.children) return { ...n, children: patchChildren(n.children as NodeData[], key, children) };
    return n;
  });
}

function TableDetail({
  catalog,
  schema,
  table,
  monacoTheme,
}: {
  catalog: string;
  schema: string;
  table: string;
  monacoTheme: string;
}) {
  const { t } = useTranslation();
  const cols = useQuery({
    queryKey: ["desc", catalog, schema, table],
    queryFn: () => describeTable(catalog, schema, table),
  });
  const ddl = useQuery({
    queryKey: ["ddl", catalog, schema, table],
    queryFn: () => tableDDL(catalog, schema, table),
  });
  const preview = useQuery({
    queryKey: ["preview", catalog, schema, table],
    queryFn: () => previewTable(catalog, schema, table, 100),
  });

  const previewColumns = (preview.data?.columns || []).map((c, idx) => ({
    title: c.name,
    dataIndex: idx,
    width: 160,
    ellipsis: true,
    render: (v: unknown) =>
      v == null ? <span style={{ opacity: 0.4 }}>null</span> : String(v),
  }));
  const previewRows = (preview.data?.rows || []).map((r, i) => {
    const obj: Record<string, unknown> = { key: i };
    r.forEach((v, j) => (obj[j] = v));
    return obj;
  });

  return (
    <Card title={`${catalog}.${schema}.${table}`}>
      <Tabs
        items={[
          {
            key: "columns",
            label: t("common.columns"),
            children: (
              <Table
                size="small"
                rowKey={(r: any) => String(r.Column || r.column)}
                loading={cols.isLoading}
                dataSource={cols.data || []}
                pagination={false}
                columns={[
                  { title: "Column", dataIndex: "Column", width: 200 },
                  { title: "Type", dataIndex: "Type", width: 180 },
                  { title: "Extra", dataIndex: "Extra", width: 120 },
                  { title: "Comment", dataIndex: "Comment" },
                ]}
              />
            ),
          },
          {
            key: "ddl",
            label: t("catalog.ddl"),
            children: (
              <Editor
                height="420px"
                language="sql"
                value={ddl.data?.ddl || ""}
                theme={monacoTheme}
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }}
              />
            ),
          },
          {
            key: "preview",
            label: t("catalog.preview"),
            children: (
              <Table
                size="small"
                rowKey="key"
                loading={preview.isLoading}
                columns={previewColumns as any}
                dataSource={previewRows}
                scroll={{ x: "max-content", y: 400 }}
                pagination={{ pageSize: 50 }}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
