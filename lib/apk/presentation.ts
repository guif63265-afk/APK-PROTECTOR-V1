export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function shortHash(value?: string): string {
  if (!value) return "—";
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}
