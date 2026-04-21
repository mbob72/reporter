import {
  mockUserOptions,
  mockUsers,
} from '@report-platform/auth';

import type { LauncherUser } from '../../report-launcher-story/types';

export function buildLauncherUsers(): LauncherUser[] {
  return mockUserOptions.map((option) => {
    const user = mockUsers[option.id];

    return {
      id: option.id,
      name: option.label,
      role: user.role,
      tenantScope: user.tenantId ? [user.tenantId] : [],
      organizationScope: user.organizationId ? [user.organizationId] : [],
    };
  });
}
