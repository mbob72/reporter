import { Inject, Injectable } from '@nestjs/common';

import { canAccessTenantData } from '@report-platform/auth';
import { getAllTenants, getOrganizationsByTenant } from '@report-platform/data-access';
import {
  type CurrentUser,
  ReportInstanceListResponseSchema,
  ReportMetadataSchema,
  ReportListResponseSchema,
  SharedSettingOptionListSchema,
  type ApiError,
} from '@report-platform/contracts';
import {
  SHARED_SETTINGS_PROVIDER_TOKEN,
  type SharedSettingsProvider,
} from '@report-platform/external-api';
import { ReportRegistry } from '@report-platform/registry';

import { FileSystemReportInstanceStore } from '../../../report-instance.store';
import { REPORT_INSTANCE_STORE_TOKEN, REPORT_REGISTRY_TOKEN } from '../../../reporting.tokens';

@Injectable()
export class ReportsQueryService {
  constructor(
    @Inject(REPORT_REGISTRY_TOKEN)
    private readonly reportRegistry: ReportRegistry,
    @Inject(SHARED_SETTINGS_PROVIDER_TOKEN)
    private readonly sharedSettingsProvider: SharedSettingsProvider,
    @Inject(REPORT_INSTANCE_STORE_TOKEN)
    private readonly reportInstanceStore: FileSystemReportInstanceStore,
  ) {}

  listReports() {
    const reportList = this.reportRegistry.listReports();
    const parsedResponse = ReportListResponseSchema.safeParse(reportList);

    if (!parsedResponse.success) {
      throw new Error('Invalid report list response.');
    }

    return parsedResponse.data;
  }

  getReportMetadata(reportCode: string, currentUser: CurrentUser) {
    const reportMetadata = this.reportRegistry.getReportMetadata(reportCode, currentUser);

    if (!reportMetadata) {
      throw {
        code: 'NOT_FOUND',
        message: `Unknown report: ${reportCode}`,
      } satisfies ApiError;
    }

    const parsedMetadata = ReportMetadataSchema.safeParse(reportMetadata);

    if (!parsedMetadata.success) {
      throw new Error('Invalid report metadata.');
    }

    return parsedMetadata.data;
  }

  async listSharedSettings(reportCode: string, serviceKey: string, currentUser: CurrentUser) {
    const reportDefinition = this.reportRegistry.getReport(reportCode);

    if (!reportDefinition) {
      throw {
        code: 'NOT_FOUND',
        message: `Unknown report: ${reportCode}`,
      } satisfies ApiError;
    }

    const reportMetadata = reportDefinition.getMetadata(currentUser);
    const requiresService = reportMetadata.externalDependencies.some(
      (dependency) => dependency.serviceKey === serviceKey,
    );

    if (!requiresService) {
      throw {
        code: 'VALIDATION_ERROR',
        message: `Report does not declare external service: ${serviceKey}`,
      } satisfies ApiError;
    }

    const sharedSettingOptions = await this.sharedSettingsProvider.listOptions({
      currentUser,
      reportCode,
      serviceKey,
    });
    const parsedResponse = SharedSettingOptionListSchema.safeParse(sharedSettingOptions);

    if (!parsedResponse.success) {
      throw new Error('Invalid shared settings response.');
    }

    return parsedResponse.data;
  }

  listTenants(currentUser: CurrentUser) {
    const allTenants = getAllTenants();

    if (currentUser.role === 'Admin') {
      return allTenants;
    }

    if (currentUser.role === 'TenantAdmin' && currentUser.tenantId) {
      return allTenants.filter((tenantOption) => tenantOption.id === currentUser.tenantId);
    }

    return [];
  }

  listOrganizationsByTenant(tenantId: string, currentUser: CurrentUser) {
    if (!canAccessTenantData(currentUser, tenantId)) {
      throw {
        code: 'FORBIDDEN',
        message: 'You do not have access to this tenant.',
      } satisfies ApiError;
    }

    return getOrganizationsByTenant(tenantId);
  }

  async listReportInstancesByReportCode(reportCode: string) {
    const reportDefinition = this.reportRegistry.getReport(reportCode);

    if (!reportDefinition) {
      throw {
        code: 'NOT_FOUND',
        message: `Unknown report: ${reportCode}`,
      } satisfies ApiError;
    }

    const instances = await this.reportInstanceStore.listByReportCode(reportCode);
    const payload = instances.map((instance) => ({
      id: instance.id,
      reportCode: instance.reportCode,
      status: instance.status,
      createdAt: instance.createdAt,
      finishedAt: instance.finishedAt,
      fileName: instance.fileName,
      byteLength: instance.byteLength,
      downloadUrl:
        instance.status === 'completed' && instance.artifactId
          ? `/generated-files/${instance.artifactId}`
          : undefined,
    }));
    const parsedResponse = ReportInstanceListResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      throw new Error('Invalid report instances payload.');
    }

    return parsedResponse.data;
  }
}
