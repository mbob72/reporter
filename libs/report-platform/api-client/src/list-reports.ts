import { type MockUserId, MOCK_USER_HEADER } from '@report-platform/auth';
import {
  ApiErrorSchema,
  ReportListResponseSchema,
  type ReportListResponse,
} from '@report-platform/contracts';

export type ListReportsOptions = {
  mockUserId: MockUserId;
};

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function listReports(
  options: ListReportsOptions,
): Promise<ReportListResponse> {
  const response = await fetch('/reports', {
    method: 'GET',
    headers: {
      [MOCK_USER_HEADER]: options.mockUserId,
    },
  });
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(payload);

    if (parsedError.success) {
      throw parsedError.data;
    }

    throw new Error(`API request failed with status ${response.status}.`);
  }

  const parsedResponse = ReportListResponseSchema.safeParse(payload);

  if (!parsedResponse.success) {
    throw new Error('API returned an invalid report list payload.');
  }

  return parsedResponse.data;
}
