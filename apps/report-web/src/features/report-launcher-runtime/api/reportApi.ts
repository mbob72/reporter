import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { z } from 'zod';
import type { MockUserId } from '@report-platform/auth';

import {
  ReportInstanceListResponseSchema,
  ReportInstanceSchema,
  ReportLaunchAcceptedSchema,
  ReportListResponseSchema,
  ReportMetadataSchema,
  SIMPLE_SALES_SUMMARY_REPORT_CODE,
  SharedSettingOptionListSchema,
  type LaunchReportParams,
  type ReportInstance,
  type ReportInstanceListItem,
  type ReportLaunchAccepted,
  type ReportListItem,
  type ReportMetadata,
  type SharedSettingOption,
} from '@report-platform/contracts';
import { resolveGeneratedFileName } from '../lib/downloadGeneratedFile';
import { clearSession, selectMockUser, setAccessToken } from '../store/sessionSlice';

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
const IssueDevTokenResponseSchema = z.object({
  accessToken: z.string().trim().min(1),
  mockUserId: z.string().trim().min(1),
});
const RefreshSessionResponseSchema = z.object({
  accessToken: z.string().trim().min(1),
  mockUserId: z.string().trim().min(1),
});
const LogoutResponseSchema = z.object({
  success: z.boolean(),
});

export type TenantOption = z.infer<typeof TenantOptionSchema>;
export type OrganizationOption = z.infer<typeof OrganizationOptionSchema>;
export type IssueDevTokenResponse = z.infer<typeof IssueDevTokenResponseSchema>;
export type RefreshSessionResponse = z.infer<typeof RefreshSessionResponseSchema>;
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
export type DownloadGeneratedFileResponse = {
  fileBlob: Blob;
  fileName: string;
};

function parseWithSchema<T>(schema: z.ZodType<T>, payload: unknown, message: string): T {
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(message);
  }

  return parsed.data;
}

export function buildGeneratedFileDownloadUrl(artifactId: string): string {
  return `/generated-files/${encodeURIComponent(artifactId)}`;
}

const apiBaseUrl =
  typeof window === 'undefined' ? 'http://localhost/' : `${window.location.origin}/`;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as {
      session?: { accessToken?: string | null };
    };
    const accessToken = state.session?.accessToken;

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401) {
    return result;
  }

  const shouldSkipRefresh =
    (typeof args === 'string' && args.startsWith('auth/')) ||
    (typeof args !== 'string' && typeof args.url === 'string' && args.url.startsWith('auth/'));

  if (shouldSkipRefresh) {
    return result;
  }

  const refreshResult = await rawBaseQuery(
    {
      url: 'auth/refresh',
      method: 'POST',
    },
    api,
    extraOptions,
  );

  if (refreshResult.data) {
    const refreshPayload = parseWithSchema(
      RefreshSessionResponseSchema,
      refreshResult.data,
      'Invalid refresh session payload.',
    );

    api.dispatch(selectMockUser(refreshPayload.mockUserId as MockUserId));
    api.dispatch(setAccessToken(refreshPayload.accessToken));
    result = await rawBaseQuery(args, api, extraOptions);

    return result;
  }

  api.dispatch(clearSession());

  return result;
};

export const reportApi = createApi({
  reducerPath: 'reportApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    listReports: builder.query<ReportListItem[], void>({
      query: () => ({
        url: 'reports',
        method: 'GET',
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(ReportListResponseSchema, response, 'Invalid reports response payload.'),
    }),
    issueDevToken: builder.mutation<IssueDevTokenResponse, { mockUserId: string }>({
      query: ({ mockUserId }) => ({
        url: 'auth/dev-token',
        method: 'POST',
        body: {
          mockUserId,
        },
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(IssueDevTokenResponseSchema, response, 'Invalid dev token payload.'),
    }),
    refreshSession: builder.mutation<RefreshSessionResponse, void>({
      query: () => ({
        url: 'auth/refresh',
        method: 'POST',
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(RefreshSessionResponseSchema, response, 'Invalid refresh payload.'),
    }),
    logoutSession: builder.mutation<LogoutResponse, void>({
      query: () => ({
        url: 'auth/logout',
        method: 'POST',
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(LogoutResponseSchema, response, 'Invalid logout payload.'),
    }),
    getReportMetadata: builder.query<ReportMetadata, string>({
      query: (reportCode) => ({
        url: `reports/${encodeURIComponent(reportCode)}/metadata`,
        method: 'GET',
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(ReportMetadataSchema, response, 'Invalid report metadata payload.'),
    }),
    listTenants: builder.query<TenantOption[], string | void>({
      query: () => ({
        url: 'tenants',
        method: 'GET',
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(TenantOptionListSchema, response, 'Invalid tenants response payload.'),
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
      { serviceKey: string; mockUserId?: string }
    >({
      query: ({ serviceKey }) => ({
        url: `reports/${encodeURIComponent(SIMPLE_SALES_SUMMARY_REPORT_CODE)}/external-services/${encodeURIComponent(serviceKey)}/shared-settings`,
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
        parseWithSchema(ReportLaunchAcceptedSchema, response, 'Invalid launch response payload.'),
    }),
    getReportInstance: builder.query<ReportInstance, string>({
      query: (reportInstanceId) => ({
        url: `report-runs/${encodeURIComponent(reportInstanceId)}`,
        method: 'GET',
      }),
      transformResponse: (response: unknown) =>
        parseWithSchema(ReportInstanceSchema, response, 'Invalid report instance payload.'),
    }),
    listReportInstancesByReportCode: builder.query<ReportInstanceListItem[], string>({
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
    }),
    downloadGeneratedFile: builder.mutation<
      DownloadGeneratedFileResponse,
      { downloadUrl: string; fallbackFileName: string }
    >({
      queryFn: async ({ downloadUrl, fallbackFileName }, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          url: downloadUrl,
          method: 'GET',
          responseHandler: (response) => response.blob(),
        });

        if (result.error) {
          return { error: result.error };
        }

        const fileBlob = result.data as Blob;
        const responseHeaders = (
          result as {
            meta?: { response?: Response };
          }
        ).meta?.response?.headers;
        const fileName = resolveGeneratedFileName(
          responseHeaders?.get('Content-Disposition') ?? null,
          fallbackFileName,
        );

        return {
          data: {
            fileBlob,
            fileName,
          },
        };
      },
    }),
  }),
});

export const {
  useIssueDevTokenMutation,
  useRefreshSessionMutation,
  useLogoutSessionMutation,
  useListReportsQuery,
  useGetReportMetadataQuery,
  useListTenantsQuery,
  useListOrganizationsByTenantQuery,
  useListSharedSettingsQuery,
  useLaunchReportMutation,
  useGetReportInstanceQuery,
  useListReportInstancesByReportCodeQuery,
  useDownloadGeneratedFileMutation,
} = reportApi;
