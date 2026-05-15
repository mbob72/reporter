import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';

import { DevAuthService } from './dev-auth.service';

describe('DevAuthService session lifecycle', () => {
  function createService(): DevAuthService {
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET = 'access-secret';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '1d';

    return new DevAuthService(new JwtService());
  }

  it('issues access + refresh token', () => {
    const service = createService();

    const issued = service.issueDevToken('admin');

    expect(issued.accessToken).toEqual(expect.any(String));
    expect(issued.refreshToken).toEqual(expect.any(String));
    expect(issued.accessToken).not.toBe(issued.refreshToken);
  });

  it('rotates refresh token and invalidates previous token', () => {
    const service = createService();
    const issued = service.issueDevToken('admin');

    const rotated = service.refreshSession(issued.refreshToken);

    expect(rotated.accessToken).toEqual(expect.any(String));
    expect(rotated.refreshToken).toEqual(expect.any(String));
    expect(rotated.refreshToken).not.toBe(issued.refreshToken);
    expect(() => service.refreshSession(issued.refreshToken)).toThrow();
  });

  it('revokes session on logout', () => {
    const service = createService();
    const issued = service.issueDevToken('admin');

    service.revokeSession(issued.refreshToken);

    expect(() => service.refreshSession(issued.refreshToken)).toThrow();
  });

  it('rejects invalid refresh token', () => {
    const service = createService();

    expect(() => service.refreshSession('invalid-token')).toThrow();
  });

  it('does not fail when revoke called with empty token', () => {
    const service = createService();

    expect(() => service.revokeSession(null)).not.toThrow();
    expect(() => service.revokeSession(undefined)).not.toThrow();
  });
});
