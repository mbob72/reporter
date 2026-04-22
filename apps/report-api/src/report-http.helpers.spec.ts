import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { hasRoleAccess, isBuiltFile, toHttpException } from './report-http.helpers';

describe('hasRoleAccess', () => {
  it('supports hierarchy Auditor < Member < TenantAdmin < Admin', () => {
    expect(hasRoleAccess('Auditor', 'Auditor')).toBe(true);
    expect(hasRoleAccess('Member', 'Auditor')).toBe(true);
    expect(hasRoleAccess('TenantAdmin', 'Member')).toBe(true);
    expect(hasRoleAccess('Admin', 'TenantAdmin')).toBe(true);
  });

  it('returns false when role is below required minimum', () => {
    expect(hasRoleAccess('Auditor', 'Member')).toBe(false);
    expect(hasRoleAccess('Member', 'TenantAdmin')).toBe(false);
    expect(hasRoleAccess('TenantAdmin', 'Admin')).toBe(false);
  });
});

describe('isBuiltFile', () => {
  it('returns true for valid BuiltFile', () => {
    expect(
      isBuiltFile({
        fileName: 'report.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        bytes: new Uint8Array([1, 2, 3]),
      }),
    ).toBe(true);
  });

  it('returns false for invalid values', () => {
    expect(isBuiltFile(null)).toBe(false);
    expect(isBuiltFile({})).toBe(false);
    expect(
      isBuiltFile({
        fileName: 'report.xlsx',
        mimeType: 'application/octet-stream',
        bytes: [1, 2, 3],
      }),
    ).toBe(false);
  });
});

describe('toHttpException', () => {
  it('maps VALIDATION_ERROR to 400', () => {
    const exception = toHttpException({
      code: 'VALIDATION_ERROR',
      message: 'Invalid payload.',
    });

    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.getResponse()).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Invalid payload.',
    });
  });

  it('maps FORBIDDEN to 403', () => {
    const exception = toHttpException({
      code: 'FORBIDDEN',
      message: 'Forbidden.',
    });

    expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
  });

  it('maps NOT_FOUND to 404', () => {
    const exception = toHttpException({
      code: 'NOT_FOUND',
      message: 'Not found.',
    });

    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
  });

  it('maps unknown errors to 500 with generic message', () => {
    const exception = toHttpException(new Error('Boom'));

    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(exception.getResponse()).toEqual({
      message: 'Unexpected server error.',
    });
  });
});
