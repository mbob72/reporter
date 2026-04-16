import {
  MockSalesCommissionXlsxRawInputSchema,
  type MockSalesCommissionXlsxRawInput,
} from './mock-sales-commission-xlsx.contract';

const rawMockSalesCommissionXlsxInput: MockSalesCommissionXlsxRawInput = {
  reportMonth: '2026-03',
  currency: 'EUR',
  orders: [
    {
      id: 'ORD-2026-0301',
      manager: 'Alice Novak',
      qty: 12,
      unitPriceEUR: 199.5,
      status: 'confirmed',
    },
    {
      id: 'ORD-2026-0302',
      manager: 'Alice Novak',
      qty: 3,
      unitPriceEUR: 950,
      status: 'pending',
    },
    {
      id: 'ORD-2026-0303',
      manager: 'Marko Petrovic',
      qty: 7,
      unitPriceEUR: 420,
      status: 'confirmed',
    },
    {
      id: 'ORD-2026-0304',
      manager: 'Marko Petrovic',
      qty: 2,
      unitPriceEUR: 1200,
      status: 'cancelled',
    },
    {
      id: 'ORD-2026-0305',
      manager: 'Jelena Ilic',
      qty: 9,
      unitPriceEUR: 315,
      status: 'confirmed',
    },
    {
      id: 'ORD-2026-0306',
      manager: 'Jelena Ilic',
      qty: 4,
      unitPriceEUR: 500,
      status: 'confirmed',
    },
    {
      id: 'ORD-2026-0307',
      manager: 'Alice Novak',
      qty: 1,
      unitPriceEUR: 2500,
      status: 'confirmed',
    },
  ],
  commissionRules: [
    {
      manager: 'Alice Novak',
      commissionRate: 0.08,
    },
    {
      manager: 'Marko Petrovic',
      commissionRate: 0.065,
    },
    {
      manager: 'Jelena Ilic',
      commissionRate: 0.0725,
    },
  ],
};

export const mockSalesCommissionXlsxInput =
  MockSalesCommissionXlsxRawInputSchema.parse(rawMockSalesCommissionXlsxInput);
