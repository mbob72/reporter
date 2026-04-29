import { z } from 'zod';

export const SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE = 'simple-sales-summary-xlsx';
export const SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS = [
  'winter_base',
  'holiday_spike',
  'margin_protection',
] as const;

export const SimpleSalesSummaryXlsxDatasetKeySchema = z.enum(
  SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS,
);
export const SimpleSalesSummaryXlsxRoleSchema = z.enum(['developer', 'designer', 'manager']);

export const SimpleSalesSummaryXlsxLaunchParamsSchema = z.object({
  name: z.string().trim().min(2).max(10),
  job: z.string().trim().min(1),
  email: z.string().trim().email(),
  favoriteColor: z.string().regex(/^#([0-9a-f]{3}){1,2}$/),
  age: z.number().min(18).max(99),
  website: z.string().trim().url(),
  role: SimpleSalesSummaryXlsxRoleSchema,
  datasetKey: SimpleSalesSummaryXlsxDatasetKeySchema.optional(),
});

export type SimpleSalesSummaryXlsxDatasetKey = z.infer<
  typeof SimpleSalesSummaryXlsxDatasetKeySchema
>;
export type SimpleSalesSummaryXlsxRole = z.infer<typeof SimpleSalesSummaryXlsxRoleSchema>;
export type SimpleSalesSummaryXlsxLaunchParams = z.infer<
  typeof SimpleSalesSummaryXlsxLaunchParamsSchema
>;
