import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Logger,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';

import { getCurrentUser, MOCK_USER_HEADER } from '@report-platform/auth';

import { toHttpException } from './report-http.helpers';
import { GeneratedFilesService } from './modules/reports/services/generated-files.service';
import { ReportsLaunchService } from './modules/reports/services/reports-launch.service';
import { ReportsQueryService } from './modules/reports/services/reports-query.service';

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
};

@Controller()
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

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
  async listReports(@Req() req: RequestWithHeaders) {
    try {
      const currentUser = getCurrentUser(req.headers);
      const payload = this.reportsQueryService.listReports();

      this.logger.log(
        `list reports count=${payload.length} mockUser=${req.headers[MOCK_USER_HEADER] ?? currentUser.userId}`,
      );

      return payload;
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Get('reports/:code/metadata')
  @HttpCode(200)
  async getReportMetadata(@Param('code') reportCode: string, @Req() req: RequestWithHeaders) {
    try {
      return this.reportsQueryService.getReportMetadata(reportCode, req);
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
      return await this.reportsQueryService.listSharedSettings(reportCode, serviceKey, req);
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Get('tenants')
  @HttpCode(200)
  async listTenants(@Req() req: RequestWithHeaders) {
    try {
      return this.reportsQueryService.listTenants(req);
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
      return this.reportsQueryService.listOrganizationsByTenant(tenantId, req);
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
    try {
      const { launch, mockUser } = await this.reportsLaunchService.launchReport(
        reportCode,
        body,
        req,
      );

      this.logger.log(`launch report=${reportCode} mockUser=${mockUser}`);

      return launch;
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Get('reports/:reportCode/instances')
  @HttpCode(200)
  async listReportInstancesByReportCode(@Param('reportCode') reportCode: string) {
    try {
      return await this.reportsQueryService.listReportInstancesByReportCode(reportCode);
    } catch (error) {
      throw toHttpException(error);
    }
  }

  @Get('generated-files/:fileId')
  @HttpCode(200)
  async downloadGeneratedFile(@Param('fileId') fileId: string, @Res() res: any) {
    try {
      const generatedFile = await this.generatedFilesService.getGeneratedFile(fileId);

      res.setHeader('Content-Type', generatedFile.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${generatedFile.fileName}"`);
      res.setHeader('Content-Length', String(generatedFile.byteLength));
      res.send(generatedFile.bytes);
    } catch (error) {
      throw toHttpException(error);
    }
  }
}
