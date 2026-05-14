import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

import { CurrentUserSchema, type CurrentUser } from '@report-platform/contracts';

import { getJwtRuntimeConfig } from './jwt.config';
import { IS_PUBLIC_ROUTE_KEY } from './public.decorator';

type RequestWithUser = {
  headers?: Record<string, string | string[] | undefined>;
  user?: CurrentUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtConfig = getJwtRuntimeConfig();

  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublicRoute) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.readBearerToken(request.headers);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(token, {
        secret: this.jwtConfig.secret,
        ...this.jwtConfig.verifyOptions,
      });
      const parsedUser = CurrentUserSchema.safeParse(payload);

      if (!parsedUser.success) {
        throw new UnauthorizedException('Invalid JWT claims.');
      }

      request.user = parsedUser.data;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid bearer token.');
    }
  }

  private readBearerToken(
    headers: Record<string, string | string[] | undefined> | undefined,
  ): string | undefined {
    if (!headers) {
      return undefined;
    }

    const value = headers.authorization ?? headers.Authorization;
    const authorizationHeader = Array.isArray(value) ? value[0] : value;

    if (!authorizationHeader) {
      return undefined;
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }
}
