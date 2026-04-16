import { z } from 'zod';

import { WorkbookSchema } from '@report-platform/xlsx';

const ReportMonthSchema = z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const CurrencyCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/);

export const OrderStatusSchema = z.enum(['confirmed', 'pending', 'cancelled']);

export const CommissionOrderSchema = z.object({
  id: z.string().trim().min(1),
  manager: z.string().trim().min(1),
  qty: z.number().int().positive(),
  unitPriceEUR: z.number().positive(),
  status: OrderStatusSchema,
});

export const CommissionRuleSchema = z.object({
  manager: z.string().trim().min(1),
  commissionRate: z.number().nonnegative().max(1),
});

export const MockSalesCommissionXlsxRawInputSchema = z
  .object({
    reportMonth: ReportMonthSchema,
    currency: CurrencyCodeSchema,
    orders: z.array(CommissionOrderSchema).min(1),
    commissionRules: z.array(CommissionRuleSchema).min(1),
  })
  .superRefine((input, ctx) => {
    const seenOrderIds = new Set<string>();

    input.orders.forEach((order, index) => {
      if (seenOrderIds.has(order.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['orders', index, 'id'],
          message: `Duplicate order id: ${order.id}`,
        });
      }

      seenOrderIds.add(order.id);
    });

    const seenManagers = new Set<string>();

    input.commissionRules.forEach((rule, index) => {
      if (seenManagers.has(rule.manager)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['commissionRules', index, 'manager'],
          message: `Duplicate manager in commissionRules: ${rule.manager}`,
        });
      }

      seenManagers.add(rule.manager);
    });
  });

export const MockSalesCommissionXlsxParamsSchema = z
  .object({
    input: MockSalesCommissionXlsxRawInputSchema.optional(),
  })
  .default({});

export const MockSalesCommissionWorkbookMetadataSchema = z.object({
  reportMonth: ReportMonthSchema,
  currency: CurrencyCodeSchema,
  sheetNames: z.tuple([
    z.literal('Orders'),
    z.literal('CommissionRules'),
    z.literal('CommissionReport'),
  ]),
  namedRangeNames: z.array(z.string().trim().min(1)).min(1),
  orderCount: z.number().int().positive(),
  managerCount: z.number().int().positive(),
});

export const MockSalesCommissionBuiltFileMetadataSchema = z.object({
  fileName: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  byteLength: z.number().int().nonnegative(),
});

export const MockSalesCommissionXlsxResultSchema = z.object({
  workbookMetadata: MockSalesCommissionWorkbookMetadataSchema,
  workbookModel: WorkbookSchema,
  builtFile: MockSalesCommissionBuiltFileMetadataSchema,
});

export type CommissionOrder = z.infer<typeof CommissionOrderSchema>;
export type CommissionRule = z.infer<typeof CommissionRuleSchema>;
export type MockSalesCommissionXlsxRawInput = z.infer<
  typeof MockSalesCommissionXlsxRawInputSchema
>;
export type MockSalesCommissionXlsxParams = z.infer<
  typeof MockSalesCommissionXlsxParamsSchema
>;
export type MockSalesCommissionWorkbookMetadata = z.infer<
  typeof MockSalesCommissionWorkbookMetadataSchema
>;
export type MockSalesCommissionBuiltFileMetadata = z.infer<
  typeof MockSalesCommissionBuiltFileMetadataSchema
>;
export type MockSalesCommissionXlsxResult = z.infer<
  typeof MockSalesCommissionXlsxResultSchema
>;
