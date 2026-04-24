import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  InputNumber,
  Row,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import { CopyOutlined, FormatPainterOutlined } from "@ant-design/icons";
import Editor from "@monaco-editor/react";
import { useTranslation } from "react-i18next";
import { format as sqlFormat } from "sql-formatter";
import { useUiStore } from "@/stores/ui";

const { Title } = Typography;

const SAMPLE_SQL =
  `select t.id, t.name, sum(o.amount) from orders o join users t on t.id=o.user_id where o.created_at >= date '2024-01-01' group by t.id, t.name order by 3 desc limit 100;`;

export default function SqlFormatter() {
  const { t } = useTranslation();
  const { theme } = useUiStore();
  const [input, setInput] = useState(SAMPLE_SQL);
  const [output, setOutput] = useState("");
  const [uppercase, setUppercase] = useState(true);
  const [indent, setIndent] = useState(2);
  const [liveFormat, setLiveFormat] = useState(true);

  const run = () => {
    try {
      const out = sqlFormat(input, {
        language: "trino",
        keywordCase: uppercase ? "upper" : "lower",
        tabWidth: indent,
      });
      setOutput(out);
    } catch (e) {
      setOutput("");
      message.error((e as Error).message);
    }
  };

  useEffect(() => {
    if (liveFormat) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, uppercase, indent, liveFormat]);

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    message.success(t("common.copy"));
  };

  const monacoTheme = theme === "dark" ? "vs-dark" : "light";

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        {t("formatter.title")}
      </Title>
      <Card>
        <Space wrap style={{ marginBottom: 12 }}>
          <Button type="primary" icon={<FormatPainterOutlined />} onClick={run}>
            {t("common.format")}
          </Button>
          <Button icon={<CopyOutlined />} onClick={copy} disabled={!output}>
            {t("common.copy")}
          </Button>
          <span>
            {t("formatter.uppercaseKeywords")}{" "}
            <Switch checked={uppercase} onChange={setUppercase} />
          </span>
          <span>
            {t("formatter.indent")}{" "}
            <InputNumber
              min={1}
              max={8}
              value={indent}
              onChange={(v) => setIndent(v ?? 2)}
              style={{ width: 72 }}
            />
          </span>
          <span>
            Live{" "}
            <Switch checked={liveFormat} onChange={setLiveFormat} />
          </span>
        </Space>
        <Row gutter={12}>
          <Col span={12}>
            <div style={{ marginBottom: 4 }}>{t("formatter.input")}</div>
            <Editor
              height="520px"
              language="sql"
              value={input}
              onChange={(v) => setInput(v || "")}
              theme={monacoTheme}
              options={{ fontSize: 13, minimap: { enabled: false }, automaticLayout: true }}
            />
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 4 }}>{t("formatter.output")}</div>
            <Editor
              height="520px"
              language="sql"
              value={output}
              theme={monacoTheme}
              options={{
                readOnly: true,
                fontSize: 13,
                minimap: { enabled: false },
                automaticLayout: true,
              }}
            />
          </Col>
        </Row>
      </Card>
    </Space>
  );
}
