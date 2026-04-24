import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/ko";

dayjs.extend(relativeTime);

export const fmtDate = (iso?: string | null) =>
  iso ? dayjs(iso).format("YYYY-MM-DD HH:mm:ss") : "-";

export const fmtRelative = (iso?: string | null) =>
  iso ? dayjs(iso).fromNow() : "-";

export const fmtBytes = (bytes?: number | null): string => {
  if (bytes == null || Number.isNaN(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB", "PB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(2)} ${units[i]}`;
};

export const fmtNumber = (n?: number | null): string =>
  n == null ? "-" : n.toLocaleString();

export const fmtMs = (ms?: number | null): string => {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)} s`;
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}m ${rem.toFixed(0)}s`;
};

export const fmtPercent = (v?: number | null, digits = 1): string =>
  v == null ? "-" : `${(v * 100).toFixed(digits)}%`;
