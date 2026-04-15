import { z } from 'zod';

export const SharedSettingOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  serviceKey: z.string().min(1),
});

export const SharedSettingOptionListSchema = z.array(SharedSettingOptionSchema);

export const BrokerCredentialInputSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('manual'),
    username: z.string().trim().min(1),
    password: z.string().trim().min(1),
  }),
  z.object({
    mode: z.literal('shared_setting'),
    sharedSettingId: z.string().trim().min(1),
  }),
]);

export type SharedSettingOption = z.infer<typeof SharedSettingOptionSchema>;
export type BrokerCredentialInput = z.infer<typeof BrokerCredentialInputSchema>;
