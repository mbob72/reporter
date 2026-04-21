import type { ReportListItem } from '@report-platform/contracts';

import type { ReportDefinition } from './report-registry';

export function buildReportList(
  reportDefinitions: ReportDefinition[],
): ReportListItem[] {
  return reportDefinitions.map((reportDefinition) => ({
    code: reportDefinition.code,
    title: reportDefinition.title,
    description: reportDefinition.description,
    minRoleToLaunch: reportDefinition.getMetadata({
      userId: 'report-list-system',
      role: 'Admin',
      tenantId: null,
      organizationId: null,
    }).minRoleToLaunch,
  }));
}
