import { type MockUserId, MOCK_USER_HEADER } from '@report-platform/auth';
import {
  ApiErrorSchema,
  ReportJobStatusResponseSchema,
  type ReportJobStatusResponse,
} from '@report-platform/contracts';

export type GetReportJobStatusOptions = {
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

export async function getReportJobStatus(
  jobId: string,
  options: GetReportJobStatusOptions,
): Promise<ReportJobStatusResponse> {
  const normalizedJobId = jobId.trim();

  if (!normalizedJobId) {
    throw new Error('Invalid report job id.');
  }

  const response = await fetch(`/report-jobs/${encodeURIComponent(normalizedJobId)}`, {
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

  const parsedResponse = ReportJobStatusResponseSchema.safeParse(payload);

  if (!parsedResponse.success) {
    throw new Error('API returned an invalid report job status payload.');
  }

  return parsedResponse.data;
}
