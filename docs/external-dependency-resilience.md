# External Dependency Resilience Guide

This guide explains how to handle external dependency failures when building a new report.

It is intentionally practical and aligned with the current platform code in:

- `libs/report-platform/external-api/src/execute-with-resilience.ts`
- `libs/report-platform/external-api/src/retry-strategies.ts`
- `libs/report-platform/external-api/src/external-dependency.error.ts`

## Why This Exists

Different dependencies have different business importance:

- some failures must stop report generation (`critical`)
- some failures may be tolerated with an explicit fallback (`optional`)

Retry logic should be reusable and consistent across reports.

## Core Concepts

### 1. Dependency Criticality

Choose one per dependency usage in report/service code:

- `critical`
  - if attempts are exhausted, throw and fail the report launch
- `optional`
  - if attempts are exhausted, return an explicit fallback value and continue

Criticality is a business decision made by the report code, not by low-level HTTP clients.

### 2. Retry Strategy

Select a predefined strategy from `RetryStrategies`:

- `none`: single attempt
- `transientTwice`: max 3 attempts total
- `transientFiveWithBackoff`: max 6 attempts total with backoff

### 3. Retryable vs Non-Retryable Errors

Default classification in `isRetryableDependencyError`:

- Retryable:
  - network failure
  - timeout
  - HTTP `429`
  - HTTP `5xx`
- Non-retryable:
  - HTTP `400`
  - HTTP `401`
  - HTTP `403`
  - HTTP `404`
  - invalid local input before request
  - invalid external response shape

## Recommended Implementation Pattern

1. Keep low-level client raw and typed.
2. Throw `ExternalDependencyError` from low-level integration.
3. In report/service code, call `executeWithResilience(...)`.
4. Set:
   - criticality
   - retry strategy
   - optional fallback (if non-critical)
5. Ensure fallback is explicit and visible in report output when relevant.

## Code Examples

### Optional Dependency Example

```ts
import { executeWithResilience, RetryStrategies } from '@report-platform/external-api';

const weatherDisplay = await executeWithResilience({
  criticality: 'optional',
  retryStrategy: RetryStrategies.transientTwice,
  operation: async () => {
    const temp = await weatherClient.getCurrentTemperatureCelsius({ latitude, longitude });
    return `${temp.toFixed(1)} °C`;
  },
  fallback: () => '!error!',
});
```

Behavior:

- retry transient failures up to 3 total attempts
- on final failure, continue report with `!error!`

### Critical Dependency Example

```ts
import { executeWithResilience, RetryStrategies } from '@report-platform/external-api';

const balance = await executeWithResilience({
  criticality: 'critical',
  retryStrategy: RetryStrategies.transientTwice,
  operation: () => paymentProviderClient.getBalance(),
});
```

Behavior:

- retry transient failures up to 3 total attempts
- on final failure, throw and fail report launch

## Decision Checklist For New Reports

For each external dependency, answer all of these before implementation:

1. Is this dependency `critical` or `optional` for report correctness?
2. Which retry strategy should be used?
3. Which failure modes are expected to be transient?
4. If optional:
   - what exact fallback value is used?
   - where will the fallback be visible in result/report?
5. If critical:
   - is the error message actionable for operators/users?

## Common Mistakes To Avoid

- Putting report-specific fallback values into low-level clients.
- Retrying non-retryable errors like `401` or invalid input.
- Silently swallowing optional failures without explicit output marker.
- Copy-pasting per-report retry loops instead of using `executeWithResilience`.
