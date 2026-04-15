import { type MockUserId, MOCK_USER_HEADER } from '@report-platform/auth';
import {
  ApiErrorSchema,
  ReportCodeSchema,
  SharedSettingOptionListSchema,
  type SharedSettingOption,
} from '@report-platform/contracts';

export type ListSharedSettingsOptions = {
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

export async function listSharedSettings(
  reportCode: string,
  serviceKey: string,
  options: ListSharedSettingsOptions,
): Promise<SharedSettingOption[]> {
  const parsedReportCode = ReportCodeSchema.safeParse(reportCode);

  if (!parsedReportCode.success) {
    throw new Error('Invalid report code.');
  }

  const response = await fetch(
    `/reports/${encodeURIComponent(parsedReportCode.data)}/external-services/${encodeURIComponent(serviceKey)}/shared-settings`,
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

  const parsedResponse = SharedSettingOptionListSchema.safeParse(payload);

  if (!parsedResponse.success) {
    throw new Error('API returned invalid shared settings payload.');
  }

  return parsedResponse.data;
}
