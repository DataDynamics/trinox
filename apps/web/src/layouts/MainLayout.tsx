import { useMemo } from "react";
import { Layout, Menu, Button, Space, Dropdown, Typography } from "antd";
import {
  DashboardOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  CodeOutlined,
  ClusterOutlined,
  BulbOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HistoryOutlined,
  DotChartOutlined,
  FileSearchOutlined,
  FormatPainterOutlined,
  ProfileOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUiStore } from "@/stores/ui";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function MainLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { theme, locale, collapsed, toggleTheme, setLocale, toggleCollapsed } =
    useUiStore();

  const selectedKey = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/queries/live") || path.startsWith("/queries/") && !path.startsWith("/queries/history"))
      return "/queries/live";
    if (path.startsWith("/queries/history")) return "/queries/history";
    if (path.startsWith("/analytics/scatter")) return "/analytics/scatter";
    if (path.startsWith("/analytics/trends")) return "/analytics/trends";
    if (path.startsWith("/sql/editor")) return "/sql/editor";
    if (path.startsWith("/sql/formatter")) return "/sql/formatter";
    if (path.startsWith("/catalog")) return "/catalog";
    if (path.startsWith("/cluster")) return "/cluster";
    return "/";
  }, [location.pathname]);

  return (
    <Layout className="trinox-layout">
      <Sider collapsible collapsed={collapsed} trigger={null} width={220}>
        <div style={{ padding: 16, color: "#fff" }}>
          <Title level={4} style={{ color: "#fff", margin: 0 }}>
            {collapsed ? "Tx" : t("app.title")}
          </Title>
          {!collapsed && (
            <div style={{ fontSize: 12, opacity: 0.6 }}>{t("app.subtitle")}</div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            {
              key: "/",
              icon: <DashboardOutlined />,
              label: <Link to="/">{t("nav.dashboard")}</Link>,
            },
            {
              key: "queries",
              icon: <DatabaseOutlined />,
              label: t("nav.queries"),
              children: [
                {
                  key: "/queries/live",
                  icon: <DatabaseOutlined />,
                  label: <Link to="/queries/live">{t("nav.liveQueries")}</Link>,
                },
                {
                  key: "/queries/history",
                  icon: <HistoryOutlined />,
                  label: <Link to="/queries/history">{t("nav.queryHistory")}</Link>,
                },
              ],
            },
            {
              key: "analytics",
              icon: <LineChartOutlined />,
              label: t("nav.analytics"),
              children: [
                {
                  key: "/analytics/scatter",
                  icon: <DotChartOutlined />,
                  label: <Link to="/analytics/scatter">{t("nav.scatter")}</Link>,
                },
                {
                  key: "/analytics/trends",
                  icon: <LineChartOutlined />,
                  label: <Link to="/analytics/trends">{t("nav.trends")}</Link>,
                },
              ],
            },
            {
              key: "sql",
              icon: <CodeOutlined />,
              label: t("nav.sql"),
              children: [
                {
                  key: "/sql/editor",
                  icon: <CodeOutlined />,
                  label: <Link to="/sql/editor">{t("nav.editor")}</Link>,
                },
                {
                  key: "/sql/formatter",
                  icon: <FormatPainterOutlined />,
                  label: <Link to="/sql/formatter">{t("nav.formatter")}</Link>,
                },
              ],
            },
            {
              key: "/catalog",
              icon: <FileSearchOutlined />,
              label: <Link to="/catalog">{t("nav.catalog")}</Link>,
            },
            {
              key: "/cluster",
              icon: <ClusterOutlined />,
              label: <Link to="/cluster">{t("nav.cluster")}</Link>,
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            background: theme === "dark" ? "#141414" : "#fff",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleCollapsed}
          />
          <Space>
            <Dropdown
              menu={{
                items: [
                  { key: "ko", label: "한국어" },
                  { key: "en", label: "English" },
                ],
                selectable: true,
                selectedKeys: [locale],
                onClick: ({ key }) => {
                  const lang = key as "ko" | "en";
                  setLocale(lang);
                  void i18n.changeLanguage(lang);
                },
              }}
            >
              <Button type="text" icon={<GlobalOutlined />}>
                {locale.toUpperCase()}
              </Button>
            </Dropdown>
            <Button
              type="text"
              icon={<BulbOutlined />}
              onClick={toggleTheme}
              title={
                theme === "dark" ? t("common.lightMode") : t("common.darkMode")
              }
            />
            <Button type="text" icon={<ProfileOutlined />} disabled>
              admin
            </Button>
          </Space>
        </Header>
        <Content
          className="trinox-content"
          style={{ margin: 16, padding: 16, background: "transparent" }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
