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
} from '@nestjs/common';
import type { Request } from 'express';

import {
  canAccessTenantData,
  getCurrentUser,
  MOCK_USER_HEADER,
} from '@report-platform/auth';
import {
  getAllTenants,
  getOrganizationsByTenant,
} from '@report-platform/data-access';
import {
  ApiErrorSchema,
  LaunchReportBodySchema,
  ReportMetadataSchema,
  ReportListResponseSchema,
} from '@report-platform/contracts';
import type { ApiError } from '@report-platform/contracts';
import { ReportRegistry } from '@report-platform/registry';

import { REPORT_REGISTRY_TOKEN } from './reporting.providers';

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
  ) {}

  @Get('reports')
  @HttpCode(200)
  async listReports(@Req() req: Request) {
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
    @Req() req: Request,
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

  @Get('tenants')
  @HttpCode(200)
  async listTenants(@Req() req: Request) {
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
    @Req() req: Request,
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
    @Req() req: Request,
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

      this.logger.log(
        `launch report=${reportCode} mockUser=${req.headers[MOCK_USER_HEADER] ?? currentUser.userId}`,
      );

      return await reportDefinition.launch(currentUser, parsedBody.data.params);
    } catch (error) {
      throw toHttpException(error);
    }
  }
}
