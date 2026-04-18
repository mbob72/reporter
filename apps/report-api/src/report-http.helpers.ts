import { HttpException, HttpStatus } from '@nestjs/common';

import {
  ApiErrorSchema,
  type ApiError,
  type Role,
} from '@report-platform/contracts';
import type { BuiltFile } from '@report-platform/xlsx';

const roleRank: Record<Role, number> = {
  Auditor: 0,
  Member: 1,
  TenantAdmin: 2,
  Admin: 3,
};

export function hasRoleAccess(currentRole: Role, minRole: Role): boolean {
  return roleRank[currentRole] >= roleRank[minRole];
}

export function isBuiltFile(value: unknown): value is BuiltFile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BuiltFile>;

  return (
    typeof candidate.fileName === 'string' &&
    typeof candidate.mimeType === 'string' &&
    candidate.bytes instanceof Uint8Array
  );
}

export function toHttpException(error: unknown): HttpException {
  const parsedError = ApiErrorSchema.safeParse(error);

  if (parsedError.success) {
    switch (parsedError.data.code) {
      case 'VALIDATION_ERROR':
        return new HttpException(parsedError.data, HttpStatus.BAD_REQUEST);
      case 'FORBIDDEN':
        return new HttpException(parsedError.data, HttpStatus.FORBIDDEN);
      case 'NOT_FOUND':
        return new HttpException(parsedError.data, HttpStatus.NOT_FOUND);
    }
  }

  return new HttpException(
    { message: 'Unexpected server error.' } satisfies Partial<ApiError>,
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
