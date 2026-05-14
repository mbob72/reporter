import { UnauthorizedException, createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { CurrentUser } from '@report-platform/contracts';

type RequestWithUser = {
  user?: CurrentUser;
};

export const CurrentUserFromRequest = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new UnauthorizedException('Missing authenticated user context.');
    }

    return request.user;
  },
);

export { CurrentUserFromRequest as CurrentUser };
