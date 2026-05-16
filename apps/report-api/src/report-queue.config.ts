export type ReportQueueConfig = {
  queueName: string;
  queuePrefix?: string;
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  redisDb?: number;
  jobAttempts: number;
  jobBackoffMs: number;
  jobTimeoutMs: number;
  jobRemoveOnComplete: boolean;
  jobRemoveOnFail: boolean;
};

function parseNumber(raw: string | undefined, fallback: number): number {
  const value = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(value) ? value : fallback;
}

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) {
    return fallback;
  }

  return raw.trim().toLowerCase() === 'true';
}

export function resolveReportQueueConfig(): ReportQueueConfig {
  const queuePrefix = process.env.REPORT_QUEUE_PREFIX?.trim();
  const redisPassword = process.env.REDIS_PASSWORD?.trim();

  return {
    queueName: process.env.REPORT_QUEUE_NAME?.trim() || 'report-jobs',
    queuePrefix: queuePrefix && queuePrefix.length > 0 ? queuePrefix : undefined,
    redisHost: process.env.REDIS_HOST?.trim() || '127.0.0.1',
    redisPort: parseNumber(process.env.REDIS_PORT, 6379),
    redisPassword: redisPassword && redisPassword.length > 0 ? redisPassword : undefined,
    redisDb: process.env.REDIS_DB ? parseNumber(process.env.REDIS_DB, 0) : undefined,
    jobAttempts: parseNumber(process.env.REPORT_JOB_ATTEMPTS, 3),
    jobBackoffMs: parseNumber(process.env.REPORT_JOB_BACKOFF_MS, 5_000),
    jobTimeoutMs: parseNumber(process.env.REPORT_JOB_TIMEOUT_MS, 600_000),
    jobRemoveOnComplete: parseBoolean(process.env.REPORT_JOB_REMOVE_ON_COMPLETE, true),
    jobRemoveOnFail: parseBoolean(process.env.REPORT_JOB_REMOVE_ON_FAIL, false),
  };
}
