import {
  createApi,
  fetchBaseQuery,
} from '@reduxjs/toolkit/query/react';
import { z } from 'zod';

import { MOCK_USER_HEADER } from '@report-platform/auth';
import {
  ReportCodeSchema,
  ReportInstanceListResponseSchema,
  ReportInstanceSchema,
  ReportLaunchAcceptedSchema,
  ReportListResponseSchema,
  ReportMetadataSchema,
  SharedSettingOptionListSchema,
  type LaunchReportParams,
  type ReportInstance,
  type ReportInstanceListItem,
  type ReportLaunchAccepted,
  type ReportListItem,
  type ReportMetadata,
  type SharedSettingOption,
} from '@report-platform/contracts';

const TenantOptionSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

const OrganizationOptionSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
});

const TenantOptionListSchema = z.array(TenantOptionSchema);
const OrganizationOptionListSchema = z.array(OrganizationOptionSchema);

export type TenantOption = z.infer<typeof TenantOptionSchema>;
export type OrganizationOption = z.infer<typeof OrganizationOptionSchema>;

function parseWithSchema<T>(
  schema: z.ZodType<T>,
  payload: unknown,
  message: string,
): T {
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(message);
  }

  return parsed.data;
}

export function buildGeneratedFileDownloadUrl(artifactId: string): string {
  return `/generated-files/${encodeURIComponent(artifactId)}`;
}

export const reportApi = createApi({
  reducerPath: 'reportApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as {
        session?: { selectedMockUserId?: string };
      };
      const mockUserId = state.session?.selectedMockUserId;

      if (mockUserId) {
        headers.set(MOCK_USER_HEADER, mockUserId);
      }

      return headers;
    },
  }),
  endpoints: (builder) => ({
    listReports: builder.query<ReportListItem[], void>({
      query: () => ({
        url: 'reports',
        method: 'GET',
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(
          ReportListResponseSchema,
          response,
          'Invalid reports response payload.',
        ),
    }),
    getReportMetadata: builder.query<ReportMetadata, string>({
      query: (reportCode) => ({
        url: `reports/${encodeURIComponent(reportCode)}/metadata`,
        method: 'GET',
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(
          ReportMetadataSchema,
          response,
          'Invalid report metadata payload.',
        ),
    }),
    listTenants: builder.query<TenantOption[], string | void>({
      query: () => ({
        url: 'tenants',
        method: 'GET',
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(
          TenantOptionListSchema,
          response,
          'Invalid tenants response payload.',
        ),
    }),
    listOrganizationsByTenant: builder.query<
      OrganizationOption[],
      { tenantId: string; mockUserId?: string }
    >({
      query: ({ tenantId }) => ({
        url: `tenants/${encodeURIComponent(tenantId)}/organizations`,
        method: 'GET',
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(
          OrganizationOptionListSchema,
          response,
          'Invalid organizations response payload.',
        ),
    }),
    listSharedSettings: builder.query<
      SharedSettingOption[],
      { reportCode: string; serviceKey: string; mockUserId?: string }
    >({
      query: ({ reportCode, serviceKey }) => ({
        url: `reports/${encodeURIComponent(reportCode)}/external-services/${encodeURIComponent(serviceKey)}/shared-settings`,
        method: 'GET',
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(
          SharedSettingOptionListSchema,
          response,
          'Invalid shared settings payload.',
        ),
    }),
    launchReport: builder.mutation<
      ReportLaunchAccepted,
      { reportCode: string; params: LaunchReportParams }
    >({
      query: ({ reportCode, params }) => ({
        url: `reports/${encodeURIComponent(reportCode)}/launch`,
        method: 'POST',
        body: {
          params,
        },
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(
          ReportLaunchAcceptedSchema,
          response,
          'Invalid launch response payload.',
        ),
    }),
    getReportInstance: builder.query<ReportInstance, string>({
      query: (reportInstanceId) => ({
        url: `report-runs/${encodeURIComponent(reportInstanceId)}`,
        method: 'GET',
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(
          ReportInstanceSchema,
          response,
          'Invalid report instance payload.',
        ),
    }),
    listReportInstancesByReportCode: builder.query<ReportInstanceListItem[], string>(
      {
        query: (reportCode) => ({
          url: `reports/${encodeURIComponent(reportCode)}/instances`,
          method: 'GET',
        }),
        transformResponse: (response: unknown) =>
          parseWithSchema(
            ReportInstanceListResponseSchema,
            response,
            'Invalid report instances payload.',
          ),
      },
    ),
  }),
});


export const {
  useListReportsQuery,
  useGetReportMetadataQuery,
  useListTenantsQuery,
  useListOrganizationsByTenantQuery,
  useListSharedSettingsQuery,
  useLaunchReportMutation,
  useGetReportInstanceQuery,
  useListReportInstancesByReportCodeQuery,
} = reportApi;
