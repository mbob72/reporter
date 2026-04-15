import type { ApiError } from '@report-platform/contracts';

import type { AuthSession, ExternalAuthProvider } from './auth-provider';

function throwValidationError(): never {
  throw {
    code: 'VALIDATION_ERROR',
    message: 'Username and password are required.',
  } satisfies ApiError;
}

function throwNotFound(): never {
  throw {
    code: 'NOT_FOUND',
    message: 'Unknown external service.',
  } satisfies ApiError;
}

export class MockExternalAuthProvider implements ExternalAuthProvider {
  async authenticate(input: {
    serviceKey: string;
    username: string;
    password: string;
  }): Promise<AuthSession> {
    if (!input.username.trim() || !input.password.trim()) {
      throwValidationError();
    }

    if (input.serviceKey !== 'brokerApi') {
      throwNotFound();
    }

    return {
      accessToken: `broker-token:${input.username}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }
}
