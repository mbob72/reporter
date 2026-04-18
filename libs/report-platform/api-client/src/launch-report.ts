import { type MockUserId, MOCK_USER_HEADER } from '@report-platform/auth';
import {
  ApiErrorSchema,
  LaunchReportParamsSchema,
  ReportJobAcceptedSchema,
  ReportCodeSchema,
  type ReportJobAccepted,
  type ApiError,
} from '@report-platform/contracts';

export type LaunchReportOptions = {
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

export async function launchReport(
  reportCode: string,
  params: Record<string, unknown>,
  options: LaunchReportOptions,
): Promise<ReportJobAccepted> {
  const parsedReportCode = ReportCodeSchema.safeParse(reportCode);

  if (!parsedReportCode.success) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Invalid report code.',
    } satisfies ApiError;
  }

  const parsedParams = LaunchReportParamsSchema.safeParse(params);

  if (!parsedParams.success) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request payload.',
    } satisfies ApiError;
  }

  const response = await fetch(
    `/reports/${encodeURIComponent(parsedReportCode.data)}/launch`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [MOCK_USER_HEADER]: options.mockUserId,
      },
      body: JSON.stringify({
        params: parsedParams.data,
      }),
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

  const parsedResponse = ReportJobAcceptedSchema.safeParse(payload);

  if (!parsedResponse.success) {
    throw new Error('API returned an invalid report launch payload.');
  }

  return parsedResponse.data;
}
