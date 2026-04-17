import {
  WorkbookSchema,
  type CellModel,
  type SheetModel,
  type WorkbookModel,
} from '@report-platform/xlsx';

import {
  SimpleSalesSummarySourceSchema,
  type SimpleSalesSummarySource,
} from '@report-definitions/simple-sales-summary';

import type { SimpleSalesSummaryXlsxWorkbookMetadata } from './simple-sales-summary-xlsx.contract';

type Stage2Output = {
  inputSheet: SheetModel;
};

type Stage3Output = {
  reportSheet: SheetModel;
};

export type BuildSimpleSalesSummaryWorkbookResult = {
  workbookMetadata: SimpleSalesSummaryXlsxWorkbookMetadata;
  workbookModel: WorkbookModel;
};

export function valueCell(value: string | number | boolean | null): CellModel {
  return {
    kind: 'value',
    value,
  };
}

export function formulaCell(formula: string): CellModel {
  return {
    kind: 'formula',
    formula,
  };
}

export function stage1_validateAndNormalize(
  source: unknown,
): SimpleSalesSummarySource {
  const parsedSource = SimpleSalesSummarySourceSchema.parse(source);

  return SimpleSalesSummarySourceSchema.parse({
    tenantId: parsedSource.tenantId.trim(),
    organizationId: parsedSource.organizationId.trim(),
    tenantName: parsedSource.tenantName.trim(),
    organizationName: parsedSource.organizationName.trim(),
    currentSalesAmount: parsedSource.currentSalesAmount,
    currency: parsedSource.currency,
  });
}

export function stage2_buildInputSheet(
  stage1: SimpleSalesSummarySource,
): Stage2Output {
  const cells: Record<string, CellModel> = {
    A1: valueCell('Field'),
    B1: valueCell('Value'),
    A2: valueCell('TenantId'),
    B2: valueCell(stage1.tenantId),
    A3: valueCell('OrganizationId'),
    B3: valueCell(stage1.organizationId),
    A4: valueCell('TenantName'),
    B4: valueCell(stage1.tenantName),
    A5: valueCell('OrganizationName'),
    B5: valueCell(stage1.organizationName),
    A6: valueCell('CurrentSalesAmount'),
    B6: valueCell(stage1.currentSalesAmount),
    A7: valueCell('Currency'),
    B7: valueCell(stage1.currency),
  };

  return {
    inputSheet: {
      name: 'SummaryInput',
      kind: 'input',
      cells,
    },
  };
}

export function stage3_buildReportSheet(
  stage1: SimpleSalesSummarySource,
): Stage3Output {
  const cells: Record<string, CellModel> = {
    A1: valueCell('Simple Sales Summary Report'),
    A3: valueCell('Tenant'),
    B3: valueCell(stage1.tenantName),
    A4: valueCell('Organization'),
    B4: valueCell(stage1.organizationName),
    A5: valueCell('Monthly Sales'),
    B5: valueCell(stage1.currentSalesAmount),
    A6: valueCell('Quarterly Estimate'),
    B6: formulaCell('B5*3'),
    A7: valueCell('Annualized Sales'),
    B7: formulaCell('B5*12'),
    A8: valueCell('Currency'),
    B8: valueCell(stage1.currency),
  };

  return {
    reportSheet: {
      name: 'SummaryReport',
      kind: 'report',
      cells,
    },
  };
}

export function stage4_finalizeWorkbookModel(
  stage1: SimpleSalesSummarySource,
  stage2: Stage2Output,
  stage3: Stage3Output,
): WorkbookModel {
  return WorkbookSchema.parse({
    modelType: 'xlsx-workbook-model',
    version: 1,
    metadata: {
      reportCode: 'simple-sales-summary-xlsx',
      title: 'Simple Sales Summary XLSX',
      fileName: `simple-sales-summary-${stage1.tenantId}.xlsx`,
    },
    sheets: [stage2.inputSheet, stage3.reportSheet],
    namedRanges: [],
  });
}

export function buildSimpleSalesSummaryWorkbook(
  source: unknown,
): BuildSimpleSalesSummaryWorkbookResult {
  const stage1 = stage1_validateAndNormalize(source);
  const stage2 = stage2_buildInputSheet(stage1);
  const stage3 = stage3_buildReportSheet(stage1);
  const workbookModel = stage4_finalizeWorkbookModel(stage1, stage2, stage3);

  return {
    workbookMetadata: {
      sheetNames: ['SummaryInput', 'SummaryReport'],
      reportCode: 'simple-sales-summary-xlsx',
      title: 'Simple Sales Summary XLSX',
    },
    workbookModel,
  };
}
