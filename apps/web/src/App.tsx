import { useEffect } from "react";
import { ConfigProvider, theme as antdTheme, App as AntApp } from "antd";
import koKR from "antd/locale/ko_KR";
import enUS from "antd/locale/en_US";
import { Route, Routes, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import LiveQueries from "./pages/LiveQueries";
import QueryDetail from "./pages/QueryDetail";
import QueryHistory from "./pages/QueryHistory";
import SqlEditor from "./pages/SqlEditor";
import SqlFormatter from "./pages/SqlFormatter";
import Catalog from "./pages/Catalog";
import ScatterAnalytics from "./pages/ScatterAnalytics";
import TrendsAnalytics from "./pages/TrendsAnalytics";
import Cluster from "./pages/Cluster";
import { useUiStore } from "./stores/ui";

export default function App() {
  const { theme, locale } = useUiStore();
  const { i18n } = useTranslation();

  useEffect(() => {
    void i18n.changeLanguage(locale);
    dayjs.locale(locale);
  }, [locale, i18n]);

  return (
    <ConfigProvider
      locale={locale === "ko" ? koKR : enUS}
      theme={{
        algorithm:
          theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="queries">
              <Route index element={<Navigate to="live" replace />} />
              <Route path="live" element={<LiveQueries />} />
              <Route path="history" element={<QueryHistory />} />
              <Route path=":queryId" element={<QueryDetail />} />
            </Route>
            <Route path="analytics">
              <Route index element={<Navigate to="scatter" replace />} />
              <Route path="scatter" element={<ScatterAnalytics />} />
              <Route path="trends" element={<TrendsAnalytics />} />
            </Route>
            <Route path="sql">
              <Route index element={<Navigate to="editor" replace />} />
              <Route path="editor" element={<SqlEditor />} />
              <Route path="formatter" element={<SqlFormatter />} />
            </Route>
            <Route path="catalog" element={<Catalog />} />
            <Route path="cluster" element={<Cluster />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AntApp>
    </ConfigProvider>
  );
}
