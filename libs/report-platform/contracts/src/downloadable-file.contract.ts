import { z } from 'zod';

export const DownloadableFileResultSchema = z.object({
  kind: z.literal('downloadable-file'),
  fileName: z.string().trim().min(1),
  byteLength: z.number().int().nonnegative(),
  downloadUrl: z.string().trim().min(1),
});

export type DownloadableFileResult = z.infer<typeof DownloadableFileResultSchema>;
