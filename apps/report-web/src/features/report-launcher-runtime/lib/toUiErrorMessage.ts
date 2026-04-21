import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { ApiErrorSchema } from '@report-platform/contracts';

function hasStatusField(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error;
}

export function toUiErrorMessage(error: unknown, fallback: string): string {
  if (hasStatusField(error)) {
    const payload = (error as { data?: unknown }).data;
    const parsed = ApiErrorSchema.safeParse(payload);

    if (parsed.success) {
      return parsed.data.message;
    }

    if (typeof (error as { error?: unknown }).error === 'string') {
      return (error as { error: string }).error;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
