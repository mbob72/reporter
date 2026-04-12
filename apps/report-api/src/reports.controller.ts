import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { getCurrentUser, MOCK_USER_HEADER } from '@auth';
import {
  ApiErrorSchema,
  LaunchSimpleReportRequestSchema,
  SimpleReportResponseSchema,
} from '@contracts';
import type { ApiError } from '@contracts';
import { SimpleReportService } from '@reporting';

import { SIMPLE_REPORT_SERVICE_TOKEN } from './reporting.providers';

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

@Controller('reports')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    @Inject(SIMPLE_REPORT_SERVICE_TOKEN)
    private readonly simpleReportService: SimpleReportService,
  ) {}

  @Post('simple-sales-summary/launch')
  @HttpCode(200)
  async launchSimpleSalesSummary(@Body() body: unknown, @Req() req: Request) {
    const parsedRequest = LaunchSimpleReportRequestSchema.safeParse(body);

    if (!parsedRequest.success) {
      throw new HttpException(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload.',
        } satisfies ApiError,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const currentUser = getCurrentUser(req.headers);

      this.logger.log(
        `launch simple-sales-summary tenant=${parsedRequest.data.tenantId} organization=${parsedRequest.data.organizationId} mockUser=${req.headers[MOCK_USER_HEADER] ?? currentUser.userId}`,
      );

      const report = await this.simpleReportService.runSimpleReport(
        currentUser,
        parsedRequest.data,
      );
      const parsedResponse = SimpleReportResponseSchema.safeParse(report);

      if (!parsedResponse.success) {
        throw new Error('Invalid report response.');
      }

      return parsedResponse.data;
    } catch (error) {
      throw toHttpException(error);
    }
  }
}
