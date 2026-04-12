import { z } from 'zod';

export const ApiErrorCodeSchema = z.enum([
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'NOT_FOUND',
]);

export const ApiErrorSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string().min(1),
});

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
