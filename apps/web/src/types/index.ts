export type QueryState =
  | "QUEUED"
  | "PLANNING"
  | "STARTING"
  | "RUNNING"
  | "FINISHING"
  | "FINISHED"
  | "FAILED"
  | "CANCELED"
  | string;

export interface LiveQuery {
  queryId: string;
  state: QueryState;
  query: string;
  queryType?: string;
  user?: string;
  source?: string;
  catalog?: string;
  schema?: string;
  createTime?: string;
  endTime?: string;
  elapsedTime?: string;
  queuedTime?: string;
  executionTime?: string;
  cpuTime?: string;
  peakMemoryBytes?: number;
  processedRows?: number;
  processedBytes?: number;
  runningDrivers?: number;
  completedDrivers?: number;
  totalDrivers?: number;
  progressPercentage?: number;
  errorCode?: { code: number; name: string; type: string };
}

export interface HistoryItem {
  query_id: string;
  state: QueryState;
  user?: string | null;
  source?: string | null;
  catalog?: string | null;
  schema?: string | null;
  query_type?: string | null;
  sql_text: string;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  elapsed_time_ms?: number | null;
  queued_time_ms?: number | null;
  execution_time_ms?: number | null;
  cpu_time_ms?: number | null;
  peak_memory_bytes?: number | null;
  processed_rows?: number | null;
  processed_bytes?: number | null;
  output_rows?: number | null;
  output_bytes?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  progress?: number | null;
}

export interface PagedResponse<T> {
  items: T[];
  meta: { page: number; page_size: number; total: number };
}

export interface ScatterPoint {
  queryId: string;
  state: string;
  user?: string;
  catalog?: string;
  queryType?: string;
  createdAt: string;
  elapsedMs: number;
  rows?: number;
  peakMemoryBytes?: number;
}

export interface TrendPoint {
  time: string;
  total: number;
  failed: number;
  failureRate: number;
  avgMs?: number | null;
  p50Ms?: number | null;
  p95Ms?: number | null;
  p99Ms?: number | null;
  minMs?: number | null;
  maxMs?: number | null;
}

export interface SqlExecuteResult {
  query_id?: string | null;
  columns: { name: string; type: string }[];
  rows: unknown[][];
  row_count: number;
  stats?: Record<string, unknown> | null;
}

export interface ClusterOverview {
  runningQueries: number;
  blockedQueries: number;
  queuedQueries: number;
  activeWorkers: number;
  runningDrivers: number;
  totalAvailableProcessors: number;
  reservedMemory: number;
  totalInputRows: number;
  totalInputBytes: number;
  totalCpuTimeSecs: number;
}

export interface NodeInfo {
  nodeIdentifier: string;
  uri: string;
  nodeVersion: { version: string };
  coordinator?: boolean;
  state?: string;
  failed?: boolean;
  lastHeartbeat?: string;
  lastResponseTime?: string;
}
