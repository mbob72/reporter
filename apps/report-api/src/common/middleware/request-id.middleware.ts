import { randomUUID } from 'crypto';

import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { REQUEST_ID_ATTRIBUTE, REQUEST_ID_HEADER } from './request-id.constants';

type RequestWithId = Request & {
  [REQUEST_ID_ATTRIBUTE]?: string;
};

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const requestIdHeader =
      req.headers[REQUEST_ID_HEADER] ?? req.headers[REQUEST_ID_HEADER.toUpperCase()];
    const requestId =
      (Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader) ?? randomUUID();

    req[REQUEST_ID_ATTRIBUTE] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
