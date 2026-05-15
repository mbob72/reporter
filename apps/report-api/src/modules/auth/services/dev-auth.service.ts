import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { decode, type JwtPayload } from 'jsonwebtoken';

import { type ApiError, type CurrentUser } from '@report-platform/contracts';
import { mockUsers, type MockUserId } from '@report-platform/auth';

import { getJwtRuntimeConfig } from '../../../common/auth/jwt.config';
import { RefreshSessionStore } from './refresh-session.store';

export type IssueDevTokenResult = {
  accessToken: string;
  refreshToken: string;
  mockUserId: MockUserId;
};

@Injectable()
export class DevAuthService {
  private readonly accessConfig = getJwtRuntimeConfig('access');
  private readonly refreshConfig = getJwtRuntimeConfig('refresh');
  private readonly refreshSessions = new RefreshSessionStore();
  private readonly jwtIssuer = process.env.JWT_ISSUER;
  private readonly jwtAudience = process.env.JWT_AUDIENCE;

  constructor(
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  issueDevToken(mockUserId: string): IssueDevTokenResult {
    this.ensureDevAuthEnabled();

    const userEntry = this.resolveUserEntryByMockUserId(mockUserId);
    const currentUser = userEntry.currentUser;
    const accessToken = this.signAccessToken(currentUser);
    const refreshToken = this.signRefreshToken(currentUser);
    const refreshTokenExpiration = this.resolveExpirationDate(refreshToken);

    this.refreshSessions.issue({
      userId: currentUser.userId,
      refreshToken,
      expiresAt: refreshTokenExpiration,
    });

    return {
      accessToken,
      refreshToken,
      mockUserId: userEntry.mockUserId,
    };
  }

  refreshSession(refreshToken: string): IssueDevTokenResult {
    const session = this.refreshSessions.findByRefreshToken(refreshToken);

    if (!session) {
      throw this.unauthorized('Refresh token is not recognized.');
    }

    if (session.revokedAt) {
      throw this.unauthorized('Refresh token was already revoked.');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw this.unauthorized('Refresh token has expired.');
    }

    const claims = this.verifyRefreshToken(refreshToken);
    const userEntry = this.resolveUserEntryByUserId(claims.userId);
    const currentUser = userEntry.currentUser;
    const accessToken = this.signAccessToken(currentUser);
    const nextRefreshToken = this.signRefreshToken(currentUser);
    const nextExpiration = this.resolveExpirationDate(nextRefreshToken);
    const replacementSession = this.refreshSessions.issue({
      userId: currentUser.userId,
      refreshToken: nextRefreshToken,
      expiresAt: nextExpiration,
    });

    this.refreshSessions.revokeByTokenId(session.tokenId, replacementSession.tokenId);

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      mockUserId: userEntry.mockUserId,
    };
  }

  revokeSession(refreshToken: string | null | undefined): void {
    if (!refreshToken) {
      return;
    }

    const session = this.refreshSessions.findByRefreshToken(refreshToken);

    if (!session) {
      return;
    }

    this.refreshSessions.revokeByTokenId(session.tokenId);
  }

  private ensureDevAuthEnabled(): void {
    if (process.env.NODE_ENV === 'production') {
      throw {
        code: 'FORBIDDEN',
        message: 'Dev auth endpoint is disabled in production.',
      } satisfies ApiError;
    }
  }

  private resolveUserEntryByMockUserId(mockUserId: string): {
    mockUserId: MockUserId;
    currentUser: CurrentUser;
  } {
    const currentUser = mockUsers[mockUserId as MockUserId] as CurrentUser | undefined;

    if (!currentUser) {
      throw {
        code: 'VALIDATION_ERROR',
        message: `Unknown mock user: ${mockUserId}`,
      } satisfies ApiError;
    }

    return {
      mockUserId: mockUserId as MockUserId,
      currentUser,
    };
  }

  private resolveUserEntryByUserId(userId: string): {
    mockUserId: MockUserId;
    currentUser: CurrentUser;
  } {
    const entry = Object.entries(mockUsers).find(([, user]) => user.userId === userId);

    if (!entry) {
      throw this.unauthorized('User is no longer available.');
    }

    const [mockUserId, currentUser] = entry;

    return {
      mockUserId: mockUserId as MockUserId,
      currentUser,
    };
  }

  private signAccessToken(currentUser: CurrentUser): string {
    const signOptions = {
      secret: this.accessConfig.secret,
      algorithm: this.accessConfig.algorithm,
      expiresIn: this.accessConfig.expiresIn,
      subject: currentUser.userId,
      jwtid: randomUUID(),
    } as const;

    return this.jwtService.sign(
      {
        ...currentUser,
        type: 'access' as const,
      },
      this.withIssuerAndAudience(signOptions),
    );
  }

  private signRefreshToken(currentUser: CurrentUser): string {
    const signOptions = {
      secret: this.refreshConfig.secret,
      algorithm: this.refreshConfig.algorithm,
      expiresIn: this.refreshConfig.expiresIn,
      subject: currentUser.userId,
      jwtid: randomUUID(),
    } as const;

    return this.jwtService.sign(
      {
        userId: currentUser.userId,
        type: 'refresh' as const,
      },
      this.withIssuerAndAudience(signOptions),
    );
  }

  private withIssuerAndAudience<T extends Record<string, unknown>>(signOptions: T): T {
    const nextOptions = { ...signOptions } as T & {
      issuer?: string;
      audience?: string;
    };

    if (this.jwtIssuer) {
      nextOptions.issuer = this.jwtIssuer;
    }

    if (this.jwtAudience) {
      nextOptions.audience = this.jwtAudience;
    }

    return nextOptions;
  }

  private verifyRefreshToken(token: string): { userId: string } {
    try {
      const payload = this.jwtService.verify<Record<string, unknown>>(token, {
        secret: this.refreshConfig.secret,
        ...this.refreshConfig.verifyOptions,
      });

      if (payload.type !== 'refresh' || typeof payload.userId !== 'string' || !payload.userId) {
        throw this.unauthorized('Invalid refresh token claims.');
      }

      return { userId: payload.userId };
    } catch (error) {
      if ((error as Error).message === 'Invalid refresh token claims.') {
        throw error;
      }

      throw this.unauthorized('Invalid refresh token.');
    }
  }

  private resolveExpirationDate(token: string): Date {
    const decoded = decode(token) as JwtPayload | null;

    if (!decoded?.exp) {
      throw this.unauthorized('Refresh token does not contain expiration.');
    }

    return new Date(decoded.exp * 1000);
  }

  private unauthorized(message: string): ApiError {
    return {
      code: 'UNAUTHORIZED',
      message,
    };
  }
}
