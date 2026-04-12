import { type MockUserId, MOCK_USER_HEADER } from '@auth';
import {
  ApiErrorSchema,
  LaunchSimpleReportRequestSchema,
  SimpleReportResponseSchema,
  type ApiError,
  type LaunchSimpleReportRequest,
  type SimpleReportResponse,
} from '@contracts';

export type LaunchSimpleReportOptions = {
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

export async function launchSimpleReport(
  request: LaunchSimpleReportRequest,
  options: LaunchSimpleReportOptions,
): Promise<SimpleReportResponse> {
  const parsedRequest = LaunchSimpleReportRequestSchema.safeParse(request);

  if (!parsedRequest.success) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request payload.',
    } satisfies ApiError;
  }

  const response = await fetch('/reports/simple-sales-summary/launch', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [MOCK_USER_HEADER]: options.mockUserId,
    },
    body: JSON.stringify(parsedRequest.data),
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(payload);

    if (parsedError.success) {
      throw parsedError.data;
    }

    throw new Error(`API request failed with status ${response.status}.`);
  }

  const parsedResponse = SimpleReportResponseSchema.safeParse(payload);

  if (!parsedResponse.success) {
    throw new Error('API returned an invalid success payload.');
  }

  return parsedResponse.data;
}
