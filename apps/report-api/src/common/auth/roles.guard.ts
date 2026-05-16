import {
  ForbiddenException,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { CurrentUser, Role } from '@report-platform/contracts';

import { IS_PUBLIC_ROUTE_KEY } from './public.decorator';
import { REQUIRED_ROLES_KEY } from './roles.decorator';

type RequestWithUser = {
  user?: CurrentUser;
};

const roleRank: Record<Role, number> = {
  Auditor: 0,
  Member: 1,
  TenantAdmin: 2,
  Admin: 3,
};

function hasRoleAccess(currentRole: Role, minRole: Role): boolean {
  return roleRank[currentRole] >= roleRank[minRole];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublicRoute) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new ForbiddenException('Missing authenticated user context.');
    }

    const currentRole = request.user.role;
    const isAllowed = requiredRoles.some((requiredRole) =>
      hasRoleAccess(currentRole, requiredRole),
    );

    if (!isAllowed) {
      throw new ForbiddenException('Insufficient role.');
    }

    return true;
  }
}
