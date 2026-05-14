import { Body, Controller, Get, HttpCode, Inject, Param, Post, Res } from '@nestjs/common';

import type { CurrentUser, LaunchReportBody } from '@report-platform/contracts';

import { CurrentUser as CurrentUserDecorator } from './common/auth/current-user.decorator';
import {
  FileIdParamSchema,
  LaunchReportBodyPayloadSchema,
  MetadataCodeParamSchema,
  ReportCodeParamSchema,
  ServiceKeyParamSchema,
  TenantIdParamSchema,
} from './common/pipes/request-schemas';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { GeneratedFilesService } from './modules/reports/services/generated-files.service';
import { ReportsLaunchService } from './modules/reports/services/reports-launch.service';
import { ReportsQueryService } from './modules/reports/services/reports-query.service';

@Controller()
export class ReportsController {
  constructor(
    @Inject(ReportsQueryService)
    private readonly reportsQueryService: ReportsQueryService,
    @Inject(ReportsLaunchService)
    private readonly reportsLaunchService: ReportsLaunchService,
    @Inject(GeneratedFilesService)
    private readonly generatedFilesService: GeneratedFilesService,
  ) {}

  @Get('reports')
  @HttpCode(200)
  listReports() {
    return this.reportsQueryService.listReports();
  }

  @Get('reports/:code/metadata')
  @HttpCode(200)
  getReportMetadata(
    @Param('code', new ZodValidationPipe(MetadataCodeParamSchema, 'Invalid report code.'))
    reportCode: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.reportsQueryService.getReportMetadata(reportCode, currentUser);
  }

  @Get('reports/:reportCode/external-services/:serviceKey/shared-settings')
  @HttpCode(200)
  listSharedSettings(
    @Param('reportCode', new ZodValidationPipe(ReportCodeParamSchema, 'Invalid report code.'))
    reportCode: string,
    @Param('serviceKey', new ZodValidationPipe(ServiceKeyParamSchema, 'Invalid service key.'))
    serviceKey: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.reportsQueryService.listSharedSettings(reportCode, serviceKey, currentUser);
  }

  @Get('tenants')
  @HttpCode(200)
  listTenants(@CurrentUserDecorator() currentUser: CurrentUser) {
    return this.reportsQueryService.listTenants(currentUser);
  }

  @Get('tenants/:tenantId/organizations')
  @HttpCode(200)
  listOrganizationsByTenant(
    @Param('tenantId', new ZodValidationPipe(TenantIdParamSchema, 'Invalid tenant id.'))
    tenantId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.reportsQueryService.listOrganizationsByTenant(tenantId, currentUser);
  }

  @Post('reports/:reportCode/launch')
  @HttpCode(200)
  launchReport(
    @Param('reportCode', new ZodValidationPipe(ReportCodeParamSchema, 'Invalid report code.'))
    reportCode: string,
    @Body(new ZodValidationPipe(LaunchReportBodyPayloadSchema, 'Invalid request payload.'))
    body: LaunchReportBody,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.reportsLaunchService.launchReport(reportCode, body, currentUser);
  }

  @Get('reports/:reportCode/instances')
  @HttpCode(200)
  listReportInstancesByReportCode(
    @Param('reportCode', new ZodValidationPipe(ReportCodeParamSchema, 'Invalid report code.'))
    reportCode: string,
  ) {
    return this.reportsQueryService.listReportInstancesByReportCode(reportCode);
  }

  @Get('generated-files/:fileId')
  @HttpCode(200)
  async downloadGeneratedFile(
    @Param('fileId', new ZodValidationPipe(FileIdParamSchema, 'Invalid file id.')) fileId: string,
    @Res() res: any,
  ) {
    const generatedFile = await this.generatedFilesService.getGeneratedFile(fileId);

    res.setHeader('Content-Type', generatedFile.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${generatedFile.fileName}"`);
    res.setHeader('Content-Length', String(generatedFile.byteLength));
    res.send(generatedFile.bytes);
  }
}
