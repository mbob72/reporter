import { z } from 'zod';

const A1AddressRegex = /^[A-Z]{1,3}[1-9][0-9]{0,6}$/;
const A1RangeRegex = /^[A-Z]{1,3}[1-9][0-9]{0,6}:[A-Z]{1,3}[1-9][0-9]{0,6}$/;

export const PrimitiveCellValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const ValueCellSchema = z.object({
  kind: z.literal('value'),
  value: PrimitiveCellValueSchema,
});

export const FormulaCellSchema = z.object({
  kind: z.literal('formula'),
  formula: z
    .string()
    .trim()
    .min(1)
    .refine((value) => !value.startsWith('='), {
      message: 'Formula must be stored without a leading "=".',
    }),
});

export const CellModelSchema = z.discriminatedUnion('kind', [
  ValueCellSchema,
  FormulaCellSchema,
]);

const A1AddressSchema = z.string().trim().regex(A1AddressRegex, {
  message: 'Cell keys must be A1-style addresses.',
});

const A1RangeSchema = z.string().trim().regex(A1RangeRegex, {
  message: 'Range must be A1-style, for example A2:B10.',
});

export const SheetKindSchema = z.enum(['input', 'report']);

export const SheetModelSchema = z.object({
  name: z.string().trim().min(1),
  kind: SheetKindSchema,
  cells: z.record(A1AddressSchema, CellModelSchema),
});

export const NamedRangeSchema = z.object({
  name: z.string().trim().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, {
    message: 'Named range must be a valid spreadsheet name.',
  }),
  sheetName: z.string().trim().min(1),
  range: A1RangeSchema,
});

export const WorkbookMetadataSchema = z
  .object({
    fileName: z.string().trim().min(1).endsWith('.xlsx').optional(),
    reportCode: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
  })
  .strict()
  .optional();

export const WorkbookSchema = z
  .object({
    modelType: z.literal('xlsx-workbook-model'),
    version: z.literal(1),
    metadata: WorkbookMetadataSchema,
    sheets: z.array(SheetModelSchema).min(1),
    namedRanges: z.array(NamedRangeSchema).default([]),
  })
  .superRefine((workbook, ctx) => {
    const seenSheetNames = new Set<string>();

    workbook.sheets.forEach((sheet, index) => {
      if (seenSheetNames.has(sheet.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sheets', index, 'name'],
          message: `Duplicate sheet name: ${sheet.name}`,
        });
      }

      seenSheetNames.add(sheet.name);
    });

    const seenNamedRanges = new Set<string>();

    workbook.namedRanges.forEach((namedRange, index) => {
      if (!seenSheetNames.has(namedRange.sheetName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['namedRanges', index, 'sheetName'],
          message: `Named range references unknown sheet: ${namedRange.sheetName}`,
        });
      }

      if (seenNamedRanges.has(namedRange.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['namedRanges', index, 'name'],
          message: `Duplicate named range: ${namedRange.name}`,
        });
      }

      seenNamedRanges.add(namedRange.name);
    });
  });

export type PrimitiveCellValue = z.infer<typeof PrimitiveCellValueSchema>;
export type ValueCell = z.infer<typeof ValueCellSchema>;
export type FormulaCell = z.infer<typeof FormulaCellSchema>;
export type CellModel = z.infer<typeof CellModelSchema>;
export type SheetModel = z.infer<typeof SheetModelSchema>;
export type NamedRange = z.infer<typeof NamedRangeSchema>;
export type WorkbookModel = z.infer<typeof WorkbookSchema>;
