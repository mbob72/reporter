import { z } from 'zod';

export const SharedSettingOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  serviceKey: z.string().min(1),
});

export const SharedSettingOptionListSchema = z.array(SharedSettingOptionSchema);

export type SharedSettingOption = z.infer<typeof SharedSettingOptionSchema>;
