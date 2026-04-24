import { apiClient } from "./client";
import type {
  ClusterOverview,
  HistoryItem,
  LiveQuery,
  NodeInfo,
  PagedResponse,
  ScatterPoint,
  SqlExecuteResult,
  TrendPoint,
} from "@/types";

// ----- cluster ---------------------------------------------------------------
export const getClusterOverview = () =>
  apiClient.get<ClusterOverview>("/api/cluster/overview").then((r) => r.data);

export const getClusterNodes = () =>
  apiClient.get<NodeInfo[]>("/api/cluster/nodes").then((r) => r.data);

export const getClusterInfo = () =>
  apiClient.get("/api/cluster/info").then((r) => r.data);

// ----- live queries ----------------------------------------------------------
export const listLiveQueries = () =>
  apiClient.get<LiveQuery[]>("/api/queries/live").then((r) => r.data);

export const getQueryDetail = (id: string) =>
  apiClient.get(`/api/queries/${id}`).then((r) => r.data);

export const killQuery = (id: string) =>
  apiClient.delete(`/api/queries/${id}`).then((r) => r.data);

// ----- sql -------------------------------------------------------------------
export interface ExecuteSqlPayload {
  sql: string;
  catalog?: string;
  schema?: string;
  limit?: number;
}

export const executeSql = (payload: ExecuteSqlPayload) =>
  apiClient.post<SqlExecuteResult>("/api/sql/execute", payload).then((r) => r.data);

export const formatSql = (payload: {
  sql: string;
  uppercase_keywords?: boolean;
  indent_width?: number;
  strip_comments?: boolean;
}) =>
  apiClient
    .post<{ formatted: string }>("/api/sql/format", payload)
    .then((r) => r.data);

export const exportSql = async (
  kind: "csv" | "json",
  payload: ExecuteSqlPayload,
): Promise<Blob> => {
  const resp = await apiClient.post(`/api/sql/export/${kind}`, payload, {
    responseType: "blob",
  });
  return resp.data as Blob;
};

// ----- catalog ---------------------------------------------------------------
export const listCatalogs = () =>
  apiClient.get<string[]>("/api/catalog/catalogs").then((r) => r.data);

export const listSchemas = (catalog: string) =>
  apiClient.get<string[]>(`/api/catalog/${catalog}/schemas`).then((r) => r.data);

export const listTables = (catalog: string, schema: string) =>
  apiClient
    .get<string[]>(`/api/catalog/${catalog}/${schema}/tables`)
    .then((r) => r.data);

export const describeTable = (catalog: string, schema: string, table: string) =>
  apiClient
    .get<Record<string, unknown>[]>(
      `/api/catalog/${catalog}/${schema}/${table}/columns`,
    )
    .then((r) => r.data);

export const tableDDL = (catalog: string, schema: string, table: string) =>
  apiClient
    .get<{ ddl: string }>(`/api/catalog/${catalog}/${schema}/${table}/ddl`)
    .then((r) => r.data);

export const previewTable = (
  catalog: string,
  schema: string,
  table: string,
  limit = 100,
) =>
  apiClient
    .get<SqlExecuteResult>(
      `/api/catalog/${catalog}/${schema}/${table}/preview`,
      { params: { limit } },
    )
    .then((r) => r.data);

// ----- history / analytics ---------------------------------------------------
export interface HistoryFilters {
  page?: number;
  page_size?: number;
  user?: string;
  state?: string;
  catalog?: string;
  query_type?: string;
  search?: string;
  since?: string;
  until?: string;
  min_elapsed_ms?: number;
  max_elapsed_ms?: number;
}

export const listHistory = (filters: HistoryFilters) =>
  apiClient
    .get<PagedResponse<HistoryItem>>("/api/history", { params: filters })
    .then((r) => r.data);

export const getHistoryFacets = () =>
  Promise.all([
    apiClient.get<string[]>("/api/history/facets/catalogs").then((r) => r.data),
    apiClient.get<string[]>("/api/history/facets/users").then((r) => r.data),
  ]).then(([catalogs, users]) => ({ catalogs, users }));

export interface ScatterFilters {
  since?: string;
  until?: string;
  catalog?: string;
  user?: string;
  state?: string;
  query_type?: string;
  limit?: number;
}

export const getScatter = (filters: ScatterFilters) =>
  apiClient
    .get<ScatterPoint[]>("/api/analytics/scatter", { params: filters })
    .then((r) => r.data);

export const getTrends = (params: {
  since?: string;
  until?: string;
  bucket_minutes?: number;
}) =>
  apiClient
    .get<TrendPoint[]>("/api/analytics/trends", { params })
    .then((r) => r.data);

export const getAnalyticsSummary = (params: { since?: string; until?: string }) =>
  apiClient.get("/api/analytics/summary", { params }).then((r) => r.data);

export const getTopUsers = (params: {
  since?: string;
  until?: string;
  limit?: number;
}) =>
  apiClient
    .get<{ user: string; total: number; avgMs: number }[]>(
      "/api/analytics/top-users",
      { params },
    )
    .then((r) => r.data);
