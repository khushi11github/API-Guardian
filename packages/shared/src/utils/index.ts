export const SCHEDULE_CRON: Record<string, string> = {
  EVERY_1_MIN: '*/1 * * * *',
  EVERY_5_MIN: '*/5 * * * *',
  EVERY_15_MIN: '*/15 * * * *',
  EVERY_30_MIN: '*/30 * * * *',
  EVERY_1_HOUR: '0 * * * *',
  EVERY_6_HOURS: '0 */6 * * *',
  DAILY: '0 0 * * *',
};

export const SCHEDULE_LABELS: Record<string, string> = {
  MANUAL: 'Manual only',
  EVERY_1_MIN: 'Every 1 minute',
  EVERY_5_MIN: 'Every 5 minutes',
  EVERY_15_MIN: 'Every 15 minutes',
  EVERY_30_MIN: 'Every 30 minutes',
  EVERY_1_HOUR: 'Every hour',
  EVERY_6_HOURS: 'Every 6 hours',
  DAILY: 'Daily',
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}…`;
}
