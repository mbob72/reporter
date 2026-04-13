import { z } from 'zod';

export const ReportListItemSchema = z.object({
  code: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

export const ReportListResponseSchema = z.array(ReportListItemSchema);

export type ReportListItem = z.infer<typeof ReportListItemSchema>;
export type ReportListResponse = z.infer<typeof ReportListResponseSchema>;
