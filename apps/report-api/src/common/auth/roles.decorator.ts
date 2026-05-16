import { SetMetadata } from '@nestjs/common';

import type { Role } from '@report-platform/contracts';

export const REQUIRED_ROLES_KEY = 'requiredRoles';

export const Roles = (...roles: Role[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);
