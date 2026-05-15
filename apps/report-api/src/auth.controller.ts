import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { z } from 'zod';
import type { Request, Response } from 'express';

import { Public } from './common/auth/public.decorator';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { DevAuthService } from './modules/auth/services/dev-auth.service';

const IssueDevTokenBodySchema = z.object({
  mockUserId: z.string().trim().min(1),
});

type IssueDevTokenBody = z.infer<typeof IssueDevTokenBodySchema>;

const REFRESH_COOKIE_NAME = 'report_refresh_token';

@Controller()
export class AuthController {
  constructor(
    @Inject(DevAuthService)
    private readonly devAuthService: DevAuthService,
  ) {}

  @Post('auth/dev-token')
  @Public()
  @HttpCode(200)
  issueDevToken(
    @Body(new ZodValidationPipe(IssueDevTokenBodySchema, 'Invalid dev token request payload.'))
    body: IssueDevTokenBody,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = this.devAuthService.issueDevToken(body.mockUserId);

    this.setRefreshCookie(response, session.refreshToken);

    return {
      accessToken: session.accessToken,
    };
  }

  @Post('auth/refresh')
  @Public()
  @HttpCode(200)
  refreshSession(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    ensureTrustedCsrfOrigin(request);
    const refreshToken = readCookie(request, REFRESH_COOKIE_NAME);

    if (!refreshToken) {
      throw {
        code: 'UNAUTHORIZED',
        message: 'Missing refresh token cookie.',
      };
    }

    const session = this.devAuthService.refreshSession(refreshToken);
    this.setRefreshCookie(response, session.refreshToken);

    return {
      accessToken: session.accessToken,
    };
  }

  @Post('auth/logout')
  @Public()
  @HttpCode(200)
  logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    ensureTrustedCsrfOrigin(request);
    const refreshToken = readCookie(request, REFRESH_COOKIE_NAME);

    this.devAuthService.revokeSession(refreshToken);
    this.clearRefreshCookie(response);

    return {
      success: true,
    };
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: resolveCookieSecure(),
      sameSite: resolveCookieSameSite(),
      path: '/auth',
    });
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: resolveCookieSecure(),
      sameSite: resolveCookieSameSite(),
      path: '/auth',
    });
  }
}

function readCookie(request: Request, cookieName: string): string | null {
  const headerValue = request.headers.cookie;

  if (!headerValue) {
    return null;
  }

  const cookieHeader = Array.isArray(headerValue) ? headerValue.join(';') : headerValue;
  const chunks = cookieHeader.split(';');

  for (const chunk of chunks) {
    const [rawName, ...rawValue] = chunk.trim().split('=');

    if (rawName === cookieName) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}

function resolveCookieSecure(): boolean {
  if (process.env.AUTH_COOKIE_SECURE !== undefined) {
    return process.env.AUTH_COOKIE_SECURE === 'true';
  }

  return process.env.NODE_ENV === 'production';
}

function resolveCookieSameSite(): 'lax' | 'strict' | 'none' {
  const raw = (process.env.AUTH_COOKIE_SAMESITE ?? 'lax').toLowerCase();

  if (raw === 'none' || raw === 'strict' || raw === 'lax') {
    return raw;
  }

  return 'lax';
}

function ensureTrustedCsrfOrigin(request: Request): void {
  const allowedOrigins = resolveAllowedOrigins();
  const originHeader = request.headers.origin;
  const originValue = Array.isArray(originHeader) ? originHeader[0] : originHeader;

  if (originValue && allowedOrigins.includes(originValue)) {
    return;
  }

  const refererHeader = request.headers.referer;
  const refererValue = Array.isArray(refererHeader) ? refererHeader[0] : refererHeader;

  if (refererValue) {
    try {
      const refererOrigin = new URL(refererValue).origin;

      if (allowedOrigins.includes(refererOrigin)) {
        return;
      }
    } catch {
      // Ignore parsing error and reject request below.
    }
  }

  throw {
    code: 'FORBIDDEN',
    message: 'Request origin is not allowed.',
  };
}

function resolveAllowedOrigins(): string[] {
  return (process.env.API_CORS_ORIGINS ?? 'http://localhost:4200,http://127.0.0.1:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
