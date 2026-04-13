import type { ApiError, CurrentUser } from '@report-platform/contracts';

import { DEFAULT_MOCK_USER_ID, type MockUserId, mockUsers } from './users.mock';

export const MOCK_USER_HEADER = 'x-mock-user';

type HeaderValue = string | string[] | undefined;
type HeadersLike = Record<string, HeaderValue>;

function readHeader(headers: HeadersLike | undefined, key: string): string | undefined {
  if (!headers) {
    return undefined;
  }

  const value = headers[key.toLowerCase()] ?? headers[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === 'string' ? value : undefined;
}

export function getCurrentUser(headers?: HeadersLike): CurrentUser {
  const requestedMockUserId = readHeader(headers, MOCK_USER_HEADER);
  const mockUserId = (requestedMockUserId ?? DEFAULT_MOCK_USER_ID) as MockUserId;
  const currentUser = mockUsers[mockUserId];

  if (!currentUser) {
    throw {
      code: 'VALIDATION_ERROR',
      message: `Unknown mock user: ${requestedMockUserId}`,
    } satisfies ApiError;
  }

  return currentUser;
}
