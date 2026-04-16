import {
  makeXlsxFile,
  WorkbookSchema,
  type BuiltFile,
  type CellModel,
  type NamedRange,
  type SheetModel,
  type WorkbookModel,
  type XlsxBinaryWriter,
} from '@report-platform/xlsx';

import {
  MockSalesCommissionXlsxRawInputSchema,
  type CommissionOrder,
  type CommissionRule,
  type MockSalesCommissionWorkbookMetadata,
} from './mock-sales-commission-xlsx.contract';

const ORDER_STATUS_ELIGIBLE = 'confirmed';

const SHEET_NAMES = {
  orders: 'Orders',
  commissionRules: 'CommissionRules',
  commissionReport: 'CommissionReport',
} as const;

type Stage1Output = {
  reportMonth: string;
  currency: string;
  orders: CommissionOrder[];
  commissionRules: CommissionRule[];
};

type Stage2Output = {
  ordersSheet: SheetModel;
  commissionRulesSheet: SheetModel;
  namedRanges: [NamedRange, NamedRange, NamedRange, NamedRange];
};

type Stage3Output = {
  commissionReportSheet: SheetModel;
};

export type BuildMockCommissionWorkbookResult = {
  workbookMetadata: MockSalesCommissionWorkbookMetadata;
  workbookModel: WorkbookModel;
  builtFile: BuiltFile;
};

function valueCell(value: string | number | boolean | null): CellModel {
  return {
    kind: 'value',
    value,
  };
}

function formulaCell(formula: string): CellModel {
  return {
    kind: 'formula',
    formula,
  };
}

function toAddress(column: string, row: number): string {
  return `${column}${row}`;
}

function createWorkbookMetadata(
  stage1: Stage1Output,
  workbookModel: WorkbookModel,
): MockSalesCommissionWorkbookMetadata {
  return {
    reportMonth: stage1.reportMonth,
    currency: stage1.currency,
    sheetNames: [
      SHEET_NAMES.orders,
      SHEET_NAMES.commissionRules,
      SHEET_NAMES.commissionReport,
    ],
    namedRangeNames: workbookModel.namedRanges.map((range) => range.name),
    orderCount: stage1.orders.length,
    managerCount: stage1.commissionRules.length,
  };
}

export function stage1_validateAndNormalize(rawInput: unknown): Stage1Output {
  const parsed = MockSalesCommissionXlsxRawInputSchema.parse(rawInput);

  return {
    reportMonth: parsed.reportMonth,
    currency: parsed.currency,
    orders: parsed.orders.map((order) => ({
      ...order,
      id: order.id.trim(),
      manager: order.manager.trim(),
    })),
    commissionRules: parsed.commissionRules.map((rule) => ({
      ...rule,
      manager: rule.manager.trim(),
    })),
  };
}

export function stage2_buildInputSheets(stage1: Stage1Output): Stage2Output {
  const ordersCells: Record<string, CellModel> = {
    A1: valueCell('OrderId'),
    B1: valueCell('Manager'),
    C1: valueCell('Qty'),
    D1: valueCell('UnitPriceEUR'),
    E1: valueCell('Status'),
    F1: valueCell('AmountEUR'),
  };

  stage1.orders.forEach((order, index) => {
    const row = index + 2;

    ordersCells[toAddress('A', row)] = valueCell(order.id);
    ordersCells[toAddress('B', row)] = valueCell(order.manager);
    ordersCells[toAddress('C', row)] = valueCell(order.qty);
    ordersCells[toAddress('D', row)] = valueCell(order.unitPriceEUR);
    ordersCells[toAddress('E', row)] = valueCell(order.status);
    ordersCells[toAddress('F', row)] = formulaCell(`C${row}*D${row}`);
  });

  const ordersSheet: SheetModel = {
    name: SHEET_NAMES.orders,
    kind: 'input',
    cells: ordersCells,
  };

  const commissionRulesCells: Record<string, CellModel> = {
    A1: valueCell('Manager'),
    B1: valueCell('CommissionRate'),
  };

  stage1.commissionRules.forEach((rule, index) => {
    const row = index + 2;

    commissionRulesCells[toAddress('A', row)] = valueCell(rule.manager);
    commissionRulesCells[toAddress('B', row)] = valueCell(rule.commissionRate);
  });

  const commissionRulesSheet: SheetModel = {
    name: SHEET_NAMES.commissionRules,
    kind: 'input',
    cells: commissionRulesCells,
  };

  const lastOrderRow = stage1.orders.length + 1;
  const lastRuleRow = stage1.commissionRules.length + 1;

  const namedRanges: [NamedRange, NamedRange, NamedRange, NamedRange] = [
    {
      name: 'OrdersManager',
      sheetName: SHEET_NAMES.orders,
      range: `B2:B${lastOrderRow}`,
    },
    {
      name: 'OrdersAmount',
      sheetName: SHEET_NAMES.orders,
      range: `F2:F${lastOrderRow}`,
    },
    {
      name: 'OrdersStatus',
      sheetName: SHEET_NAMES.orders,
      range: `E2:E${lastOrderRow}`,
    },
    {
      name: 'RulesRange',
      sheetName: SHEET_NAMES.commissionRules,
      range: `A2:B${lastRuleRow}`,
    },
  ];

  return {
    ordersSheet,
    commissionRulesSheet,
    namedRanges,
  };
}

export function stage3_buildReportSheet(
  stage1: Stage1Output,
  _stage2: Stage2Output,
): Stage3Output {
  const reportCells: Record<string, CellModel> = {
    A1: valueCell('Manager'),
    B1: valueCell('EligibleSalesEUR'),
    C1: valueCell('CommissionRate'),
    D1: valueCell('CommissionAmountEUR'),
    F1: valueCell('ReportMonth'),
    G1: valueCell('Currency'),
    F2: valueCell(stage1.reportMonth),
    G2: valueCell(stage1.currency),
  };

  stage1.commissionRules.forEach((rule, index) => {
    const row = index + 2;

    reportCells[toAddress('A', row)] = valueCell(rule.manager);
    reportCells[toAddress('B', row)] = formulaCell(
      `SUMIFS(OrdersAmount,OrdersManager,A${row},OrdersStatus,"${ORDER_STATUS_ELIGIBLE}")`,
    );
    reportCells[toAddress('C', row)] = formulaCell(
      `VLOOKUP(A${row},RulesRange,2,FALSE)`,
    );
    reportCells[toAddress('D', row)] = formulaCell(`B${row}*C${row}`);
  });

  const totalRow = stage1.commissionRules.length + 3;
  const firstManagerRow = 2;
  const lastManagerRow = totalRow - 1;

  reportCells[toAddress('A', totalRow)] = valueCell('TOTAL');
  reportCells[toAddress('B', totalRow)] = formulaCell(
    `SUM(B${firstManagerRow}:B${lastManagerRow})`,
  );
  reportCells[toAddress('D', totalRow)] = formulaCell(
    `SUM(D${firstManagerRow}:D${lastManagerRow})`,
  );

  return {
    commissionReportSheet: {
      name: SHEET_NAMES.commissionReport,
      kind: 'report',
      cells: reportCells,
    },
  };
}

export function stage4_finalizeWorkbookModel(
  stage1: Stage1Output,
  stage2: Stage2Output,
  stage3: Stage3Output,
): WorkbookModel {
  return WorkbookSchema.parse({
    modelType: 'xlsx-workbook-model',
    version: 1,
    metadata: {
      reportCode: 'mock-sales-commission-xlsx',
      title: `Mock Sales Commission ${stage1.reportMonth}`,
      fileName: `mock-sales-commission-${stage1.reportMonth}.xlsx`,
    },
    sheets: [
      stage2.ordersSheet,
      stage2.commissionRulesSheet,
      stage3.commissionReportSheet,
    ],
    namedRanges: stage2.namedRanges,
  });
}

export async function buildMockCommissionWorkbook(
  rawInput: unknown,
  writer?: XlsxBinaryWriter,
): Promise<BuildMockCommissionWorkbookResult> {
  const stage1 = stage1_validateAndNormalize(rawInput);
  const stage2 = stage2_buildInputSheets(stage1);
  const stage3 = stage3_buildReportSheet(stage1, stage2);
  const workbookModel = stage4_finalizeWorkbookModel(stage1, stage2, stage3);
  const builtFile = await makeXlsxFile(workbookModel, writer);

  return {
    workbookMetadata: createWorkbookMetadata(stage1, workbookModel),
    workbookModel,
    builtFile,
  };
}
