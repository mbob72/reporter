export type RetryStrategy = {
  maxAttempts: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
};

function createRetryStrategy(input: {
  maxAttempts: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
}): RetryStrategy {
  return {
    maxAttempts: Math.max(1, Math.floor(input.maxAttempts)),
    initialDelayMs: input.initialDelayMs ?? 0,
    backoffMultiplier: input.backoffMultiplier ?? 1,
    maxDelayMs: input.maxDelayMs ?? Number.POSITIVE_INFINITY,
  };
}

export const RetryStrategies = {
  none: createRetryStrategy({ maxAttempts: 1 }),
  transientTwice: createRetryStrategy({
    maxAttempts: 3,
    initialDelayMs: 150,
    backoffMultiplier: 1,
  }),
  transientFiveWithBackoff: createRetryStrategy({
    maxAttempts: 6,
    initialDelayMs: 150,
    backoffMultiplier: 2,
    maxDelayMs: 2_000,
  }),
} as const;

export function getDelayBeforeAttempt(params: {
  retryStrategy: RetryStrategy;
  nextAttemptNumber: number;
}): number {
  const retryIndex = params.nextAttemptNumber - 2;

  if (retryIndex < 0) {
    return 0;
  }

  const delay =
    params.retryStrategy.initialDelayMs *
    params.retryStrategy.backoffMultiplier ** retryIndex;

  if (!Number.isFinite(delay)) {
    return params.retryStrategy.maxDelayMs;
  }

  return Math.min(delay, params.retryStrategy.maxDelayMs);
}
