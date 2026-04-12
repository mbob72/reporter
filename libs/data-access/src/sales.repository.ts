import type { CurrentUser } from '@contracts';

export interface SalesRepository {
  getCurrentSalesAmount(
    currentUser: CurrentUser,
    tenantId: string,
    organizationId: string,
  ): Promise<number>;
}

export const SALES_REPOSITORY_TOKEN = 'SALES_REPOSITORY_TOKEN';
