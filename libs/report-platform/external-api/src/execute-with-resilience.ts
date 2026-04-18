import {
  isExternalDependencyError,
  type ExternalDependencyError,
} from './external-dependency.error';
import {
  getDelayBeforeAttempt,
  type RetryStrategy,
} from './retry-strategies';

export type ExternalDependencyCriticality = 'critical' | 'optional';

type CriticalExecutionOptions<TResult> = {
  criticality: 'critical';
  retryStrategy: RetryStrategy;
  operation: () => Promise<TResult>;
};

type OptionalExecutionOptions<TResult, TFallback> = {
  criticality: 'optional';
  retryStrategy: RetryStrategy;
  operation: () => Promise<TResult>;
  fallback: (error: unknown) => Promise<TFallback> | TFallback;
};

type ExecuteWithResilienceOptions<TResult, TFallback> =
  | CriticalExecutionOptions<TResult>
  | OptionalExecutionOptions<TResult, TFallback>;

const NON_RETRYABLE_HTTP_STATUSES = new Set([400, 401, 403, 404]);

function isRetryableHttpStatus(httpStatus: number): boolean {
  if (httpStatus === 429) {
    return true;
  }

  if (NON_RETRYABLE_HTTP_STATUSES.has(httpStatus)) {
    return false;
  }

  return httpStatus >= 500;
}

function isRetryableExternalDependencyError(
  error: ExternalDependencyError,
): boolean {
  if (error.category === 'network' || error.category === 'timeout') {
    return true;
  }

  if (error.category === 'http') {
    if (typeof error.httpStatus !== 'number') {
      return false;
    }

    return isRetryableHttpStatus(error.httpStatus);
  }

  return false;
}

export function isRetryableDependencyError(error: unknown): boolean {
  if (isExternalDependencyError(error)) {
    return isRetryableExternalDependencyError(error);
  }

  return false;
}

function sleep(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, delayMs);
  });
}

export async function executeWithResilience<TResult, TFallback = never>(
  options: ExecuteWithResilienceOptions<TResult, TFallback>,
): Promise<TResult | TFallback> {
  for (
    let attemptNumber = 1;
    attemptNumber <= options.retryStrategy.maxAttempts;
    attemptNumber += 1
  ) {
    try {
      return await options.operation();
    } catch (error) {
      const canRetry =
        attemptNumber < options.retryStrategy.maxAttempts &&
        isRetryableDependencyError(error);

      if (canRetry) {
        const nextAttemptNumber = attemptNumber + 1;
        const delayBeforeRetryMs = getDelayBeforeAttempt({
          retryStrategy: options.retryStrategy,
          nextAttemptNumber,
        });

        await sleep(delayBeforeRetryMs);
        continue;
      }

      if (options.criticality === 'optional') {
        return options.fallback(error);
      }

      throw error;
    }
  }

  throw new Error('Resilience execution reached an invalid state.');
}
