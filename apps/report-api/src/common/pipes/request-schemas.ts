import { z } from 'zod';

import { LaunchReportBodySchema, ReportCodeSchema } from '@report-platform/contracts';

const NonEmptyIdSchema = z.string().trim().min(1);

export const ReportCodeParamSchema = ReportCodeSchema;
export const MetadataCodeParamSchema = ReportCodeSchema;
export const TenantIdParamSchema = NonEmptyIdSchema;
export const ServiceKeyParamSchema = NonEmptyIdSchema;
export const ReportInstanceIdParamSchema = NonEmptyIdSchema;
export const FileIdParamSchema = NonEmptyIdSchema;

export const LaunchReportBodyPayloadSchema = LaunchReportBodySchema;
