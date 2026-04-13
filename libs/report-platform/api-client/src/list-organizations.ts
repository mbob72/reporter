import { z } from 'zod';

import { type MockUserId, MOCK_USER_HEADER } from '@report-platform/auth';
import { ApiErrorSchema } from '@report-platform/contracts';

const OrganizationOptionSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
});

const OrganizationOptionListSchema = z.array(OrganizationOptionSchema);

export type OrganizationOption = z.infer<typeof OrganizationOptionSchema>;

export type ListOrganizationsOptions = {
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

export async function listOrganizations(
  tenantId: string,
  options: ListOrganizationsOptions,
): Promise<OrganizationOption[]> {
  const response = await fetch(`/tenants/${encodeURIComponent(tenantId)}/organizations`, {
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

  const parsedResponse = OrganizationOptionListSchema.safeParse(payload);

  if (!parsedResponse.success) {
    throw new Error('API returned an invalid organizations payload.');
  }

  return parsedResponse.data;
}
