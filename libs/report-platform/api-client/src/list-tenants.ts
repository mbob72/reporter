import { z } from 'zod';

import { type MockUserId, MOCK_USER_HEADER } from '@report-platform/auth';
import { ApiErrorSchema } from '@report-platform/contracts';

const TenantOptionSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

const TenantOptionListSchema = z.array(TenantOptionSchema);

export type TenantOption = z.infer<typeof TenantOptionSchema>;

export type ListTenantsOptions = {
  mockUserId: MockUserId;
};

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function listTenants(options: ListTenantsOptions): Promise<TenantOption[]> {
  const response = await fetch('/tenants', {
    method: 'GET',
    headers: {
      [MOCK_USER_HEADER]: options.mockUserId,
    },
  });
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(payload);

    if (parsedError.success) {
      throw parsedError.data;
    }

    throw new Error(`API request failed with status ${response.status}.`);
  }

  const parsedResponse = TenantOptionListSchema.safeParse(payload);

  if (!parsedResponse.success) {
    throw new Error('API returned an invalid tenants payload.');
  }

  return parsedResponse.data;
}
