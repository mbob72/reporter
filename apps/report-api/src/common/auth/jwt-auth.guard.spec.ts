import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { sign } from 'jsonwebtoken';

import type { CurrentUser } from '@report-platform/contracts';

import { JwtAuthGuard } from './jwt-auth.guard';

type RequestWithUser = {
  headers?: Record<string, string>;
  user?: CurrentUser;
};

function createExecutionContext(request: RequestWithUser): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => class {},
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('allows public routes without bearer token', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector, new JwtService());

    const allowed = await guard.canActivate(createExecutionContext({ headers: {} }));

    expect(allowed).toBe(true);
  });

  it('throws 401 when bearer token is missing', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector, new JwtService());

    await expect(guard.canActivate(createExecutionContext({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws 401 for invalid token', async () => {
    process.env.JWT_SECRET = 'test-secret';

    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector, new JwtService());

    await expect(
      guard.canActivate(
        createExecutionContext({
          headers: {
            authorization: 'Bearer broken',
          },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches parsed user to request for valid token', async () => {
    process.env.JWT_SECRET = 'test-secret';

    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector, new JwtService());

    const claims: CurrentUser = {
      userId: 'user-1',
      role: 'Admin',
      tenantId: null,
      organizationId: null,
    };
    const token = sign({ ...claims, type: 'access' }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '10m',
    });
    const request: RequestWithUser = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    const allowed = await guard.canActivate(createExecutionContext(request));

    expect(allowed).toBe(true);
    expect(request.user).toEqual(claims);
  });

  it('rejects refresh token on protected routes', async () => {
    process.env.JWT_SECRET = 'test-secret';

    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector, new JwtService());

    const token = sign({ userId: 'user-1', type: 'refresh' }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '10m',
    });

    await expect(
      guard.canActivate(
        createExecutionContext({
          headers: {
            authorization: `Bearer ${token}`,
          },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
