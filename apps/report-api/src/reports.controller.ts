import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';

import {
  canAccessTenantData,
  getCurrentUser,
  MOCK_USER_HEADER,
} from '@report-platform/auth';
import type { SharedSettingsProvider } from '@report-platform/external-api';
import { SHARED_SETTINGS_PROVIDER_TOKEN } from '@report-platform/external-api';
import {
  GENERATED_FILE_STORE_TOKEN,
  type GeneratedFileStore,
} from '@report-platform/file-store';
import {
  getAllTenants,
  getOrganizationsByTenant,
} from '@report-platform/data-access';
import {
  ApiErrorSchema,
  DownloadableFileResultSchema,
  LaunchReportBodySchema,
  ReportMetadataSchema,
  ReportListResponseSchema,
  SharedSettingOptionListSchema,
  type Role,
} from '@report-platform/contracts';
import type { ApiError } from '@report-platform/contracts';
import { ReportRegistry } from '@report-platform/registry';
import type { BuiltFile } from '@report-platform/xlsx';

import { REPORT_REGISTRY_TOKEN } from './reporting.providers';

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
};

const roleRank: Record<Role, number> = {
  Auditor: 0,
  Member: 1,
  TenantAdmin: 2,
  Admin: 3,
};

function hasRoleAccess(currentRole: Role, minRole: Role): boolean {
  return roleRank[currentRole] >= roleRank[minRole];
}

function isBuiltFile(value: unknown): value is BuiltFile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BuiltFile>;

  return (
    typeof candidate.fileName === 'string' &&
    typeof candidate.mimeType === 'string' &&
    candidate.bytes instanceof Uint8Array
  );
}

function toHttpException(error: unknown): HttpException {
  const parsedError = ApiErrorSchema.safeParse(error);

  if (parsedError.success) {
    switch (parsedError.data.code) {
      case 'VALIDATION_ERROR':
        return new HttpException(parsedError.data, HttpStatus.BAD_REQUEST);
      case 'FORBIDDEN':
        return new HttpException(parsedError.data, HttpStatus.FORBIDDEN);
      case 'NOT_FOUND':
        return new HttpException(parsedError.data, HttpStatus.NOT_FOUND);
    }
  }

  return new HttpException(
    { message: 'Unexpected server error.' },
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}

@Controller()
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    @Inject(REPORT_REGISTRY_TOKEN)
    private readonly reportRegistry: ReportRegistry,
    @Inject(SHARED_SETTINGS_PROVIDER_TOKEN)
    private readonly sharedSettingsProvider: SharedSettingsProvider,
    @Inject(GENERATED_FILE_STORE_TOKEN)
    private readonly generatedFileStore: GeneratedFileStore,
  ) {}

  @Get('reports')
  @HttpCode(200)
  async listReports(@Req() req: RequestWithHeaders) {
    try {
      const currentUser = getCurrentUser(req.headers);
      const reportList = this.reportRegistry.listReports();
      const parsedResponse = ReportListResponseSchema.safeParse(reportList);

      if (!parsedResponse.success) {
        throw new Error('Invalid report list response.');
      }

      this.logger.log(
        `list reports count=${parsedResponse.data.length} mockUser=${req.headers[MOCK_USER_HEADER] ?? currentUser.userId}`,
      );

      return parsedResponse.data;
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Get('reports/:code/metadata')
  @HttpCode(200)
  async getReportMetadata(
    @Param('code') reportCode: string,
    @Req() req: RequestWithHeaders,
  ) {
    try {
      const currentUser = getCurrentUser(req.headers);
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
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Get('reports/:reportCode/external-services/:serviceKey/shared-settings')
  @HttpCode(200)
  async listSharedSettings(
    @Param('reportCode') reportCode: string,
    @Param('serviceKey') serviceKey: string,
    @Req() req: RequestWithHeaders,
  ) {
    try {
      const currentUser = getCurrentUser(req.headers);
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
      const parsedResponse = SharedSettingOptionListSchema.safeParse(
        sharedSettingOptions,
      );

      if (!parsedResponse.success) {
        throw new Error('Invalid shared settings response.');
      }

      return parsedResponse.data;
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Get('tenants')
  @HttpCode(200)
  async listTenants(@Req() req: RequestWithHeaders) {
    try {
      const currentUser = getCurrentUser(req.headers);
      const allTenants = getAllTenants();

      if (currentUser.role === 'Admin') {
        return allTenants;
      }

      if (currentUser.role === 'TenantAdmin' && currentUser.tenantId) {
        return allTenants.filter((tenantOption) => tenantOption.id === currentUser.tenantId);
      }

      return [];
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Get('tenants/:tenantId/organizations')
  @HttpCode(200)
  async listOrganizationsByTenant(
    @Param('tenantId') tenantId: string,
    @Req() req: RequestWithHeaders,
  ) {
    try {
      const currentUser = getCurrentUser(req.headers);

      if (!canAccessTenantData(currentUser, tenantId)) {
        throw {
          code: 'FORBIDDEN',
          message: 'You do not have access to this tenant.',
        } satisfies ApiError;
      }

      return getOrganizationsByTenant(tenantId);
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Post('reports/:reportCode/launch')
  @HttpCode(200)
  async launchReport(
    @Param('reportCode') reportCode: string,
    @Body() body: unknown,
    @Req() req: RequestWithHeaders,
  ) {
    const parsedBody = LaunchReportBodySchema.safeParse(body);

    if (!parsedBody.success) {
      throw new HttpException(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload.',
        } satisfies ApiError,
        HttpStatus.BAD_REQUEST,
      );
    }

    const reportDefinition = this.reportRegistry.getReport(reportCode);

    if (!reportDefinition) {
      throw new HttpException(
        {
          code: 'NOT_FOUND',
          message: `Unknown report: ${reportCode}`,
        } satisfies ApiError,
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      const currentUser = getCurrentUser(req.headers);
      const reportMetadata = reportDefinition.getMetadata(currentUser);

      if (!hasRoleAccess(currentUser.role, reportMetadata.minRoleToLaunch)) {
        throw {
          code: 'FORBIDDEN',
          message: 'You do not have access to launch this report.',
        } satisfies ApiError;
      }

      this.logger.log(
        `launch report=${reportCode} mockUser=${req.headers[MOCK_USER_HEADER] ?? currentUser.userId}`,
      );

      const reportResult = await reportDefinition.launch(
        currentUser,
        parsedBody.data.params,
      );

      if (isBuiltFile(reportResult)) {
        const { fileId } = await this.generatedFileStore.save({
          fileName: reportResult.fileName,
          mimeType: reportResult.mimeType,
          bytes: reportResult.bytes,
        });
        const downloadableResult = {
          kind: 'downloadable-file',
          fileName: reportResult.fileName,
          mimeType: reportResult.mimeType,
          byteLength: reportResult.bytes.byteLength,
          downloadUrl: `/generated-files/${fileId}`,
        };
        const parsedDownloadableResult =
          DownloadableFileResultSchema.safeParse(downloadableResult);

        if (!parsedDownloadableResult.success) {
          throw new Error('Invalid downloadable file result.');
        }

        return parsedDownloadableResult.data;
      }

      return reportResult;
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Get('generated-files/:fileId')
  @HttpCode(200)
  async downloadGeneratedFile(
    @Param('fileId') fileId: string,
    @Res() res: any,
  ) {
    try {
      const storedFile = await this.generatedFileStore.get(fileId);

      if (!storedFile) {
        throw {
          code: 'NOT_FOUND',
          message: 'Generated file not found.',
        } satisfies ApiError;
      }

      res.setHeader('Content-Type', storedFile.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${storedFile.fileName}"`,
      );
      res.setHeader('Content-Length', String(storedFile.bytes.byteLength));
      res.send(Buffer.from(storedFile.bytes));
    } catch (error) {
      throw toHttpException(error);
    }
  }
}
