import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import type { CurrentUser } from '@report-platform/contracts';

import { REQUEST_ID_ATTRIBUTE } from '../middleware/request-id.constants';

type RequestWithContext = Request & {
  user?: CurrentUser;
  [REQUEST_ID_ATTRIBUTE]?: string;
};

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpRequest');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            JSON.stringify({
              requestId: request[REQUEST_ID_ATTRIBUTE] ?? null,
              method: request.method,
              path: request.originalUrl ?? request.url,
              status: response.statusCode,
              latencyMs: Date.now() - startedAt,
              userId: request.user?.userId ?? null,
            }),
          );
        },
        error: () => {
          this.logger.log(
            JSON.stringify({
              requestId: request[REQUEST_ID_ATTRIBUTE] ?? null,
              method: request.method,
              path: request.originalUrl ?? request.url,
              status: response.statusCode,
              latencyMs: Date.now() - startedAt,
              userId: request.user?.userId ?? null,
            }),
          );
        },
      }),
    );
  }
}
