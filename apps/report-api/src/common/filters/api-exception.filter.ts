import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';

import { ApiErrorSchema } from '@report-platform/contracts';

const INTERNAL_SERVER_ERROR_RESPONSE = {
  message: 'Unexpected server error.',
};

function resolveStatusByCode(code: string): number {
  switch (code) {
    case 'VALIDATION_ERROR':
      return HttpStatus.BAD_REQUEST;
    case 'FORBIDDEN':
      return HttpStatus.FORBIDDEN;
    case 'NOT_FOUND':
      return HttpStatus.NOT_FOUND;
    case 'UNAUTHORIZED':
      return HttpStatus.UNAUTHORIZED;
    default:
      return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const parsedApiError = ApiErrorSchema.safeParse(exception);

    if (parsedApiError.success) {
      response.status(resolveStatusByCode(parsedApiError.data.code)).json(parsedApiError.data);
      return;
    }

    if (exception instanceof ZodError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload.',
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const parsedPayload = ApiErrorSchema.safeParse(payload);

      if (parsedPayload.success) {
        response.status(resolveStatusByCode(parsedPayload.data.code)).json(parsedPayload.data);
        return;
      }

      if (status === HttpStatus.BAD_REQUEST) {
        response.status(HttpStatus.BAD_REQUEST).json({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload.',
        });
        return;
      }

      if (status === HttpStatus.UNAUTHORIZED) {
        response.status(HttpStatus.UNAUTHORIZED).json({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized.',
        });
        return;
      }

      if (status === HttpStatus.FORBIDDEN) {
        response.status(HttpStatus.FORBIDDEN).json({
          code: 'FORBIDDEN',
          message: 'Forbidden.',
        });
        return;
      }

      response.status(status).json(payload);
      return;
    }

    this.logger.error('Unhandled exception', exception as Error);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(INTERNAL_SERVER_ERROR_RESPONSE);
  }
}
