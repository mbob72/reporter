import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type ApiError, type CurrentUser } from '@report-platform/contracts';
import { mockUsers, type MockUserId } from '@report-platform/auth';

export type IssueDevTokenResult = {
  accessToken: string;
};

@Injectable()
export class DevAuthService {
  constructor(
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  issueDevToken(mockUserId: string): IssueDevTokenResult {
    if (process.env.NODE_ENV === 'production') {
      throw {
        code: 'FORBIDDEN',
        message: 'Dev auth endpoint is disabled in production.',
      } satisfies ApiError;
    }

    const currentUser = mockUsers[mockUserId as MockUserId] as CurrentUser | undefined;

    if (!currentUser) {
      throw {
        code: 'VALIDATION_ERROR',
        message: `Unknown mock user: ${mockUserId}`,
      } satisfies ApiError;
    }

    const accessToken = this.jwtService.sign(currentUser, {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    });

    return {
      accessToken,
    };
  }
}
