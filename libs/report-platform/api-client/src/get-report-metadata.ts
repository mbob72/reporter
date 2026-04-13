import { type MockUserId, MOCK_USER_HEADER } from '@report-platform/auth';
import {
  ApiErrorSchema,
  ReportCodeSchema,
  ReportMetadataSchema,
  type ReportMetadata,
} from '@report-platform/contracts';

export type GetReportMetadataOptions = {
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

export async function getReportMetadata(
  reportCode: string,
  options: GetReportMetadataOptions,
): Promise<ReportMetadata> {
  const parsedReportCode = ReportCodeSchema.safeParse(reportCode);

  if (!parsedReportCode.success) {
    throw new Error('Invalid report code.');
  }

  const response = await fetch(
    `/reports/${encodeURIComponent(parsedReportCode.data)}/metadata`,
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

  const parsedMetadata = ReportMetadataSchema.safeParse(payload);

  if (!parsedMetadata.success) {
    throw new Error('API returned invalid report metadata.');
  }

  return parsedMetadata.data;
}
