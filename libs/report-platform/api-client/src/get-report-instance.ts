import { type MockUserId, MOCK_USER_HEADER } from '@report-platform/auth';
import {
  ApiErrorSchema,
  ReportInstanceSchema,
  type ReportInstance,
} from '@report-platform/contracts';

export type GetReportInstanceOptions = {
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

export async function getReportInstance(
  reportInstanceId: string,
  options: GetReportInstanceOptions,
): Promise<ReportInstance> {
  const normalizedReportInstanceId = reportInstanceId.trim();

  if (!normalizedReportInstanceId) {
    throw new Error('Invalid report instance id.');
  }

  const response = await fetch(
    `/report-runs/${encodeURIComponent(normalizedReportInstanceId)}`,
    {
      method: 'GET',
      headers: {
        [MOCK_USER_HEADER]: options.mockUserId,
      },
    },
  );
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(payload);

    if (parsedError.success) {
      throw parsedError.data;
    }

    throw new Error(`API request failed with status ${response.status}.`);
  }

  const parsedResponse = ReportInstanceSchema.safeParse(payload);

  if (!parsedResponse.success) {
    throw new Error('API returned an invalid report instance payload.');
  }

  return parsedResponse.data;
}
