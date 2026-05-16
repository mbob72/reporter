import { z } from 'zod';

export const WorkerPoolScalingStateSchema = z.enum([
  'stable',
  'scaling_up',
  'scaling_down',
  'cooldown',
]);

export const WorkerPoolStatusSchema = z.object({
  queueCounters: z.object({
    waiting: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    delayed: z.number().int().nonnegative(),
  }),
  pool: z.object({
    targetWorkers: z.number().int().nonnegative(),
    actualWorkers: z.number().int().nonnegative(),
    idleWorkers: z.number().int().nonnegative(),
    busyWorkers: z.number().int().nonnegative(),
    drainingWorkers: z.number().int().nonnegative(),
  }),
  autoscaling: z.object({
    scalingState: WorkerPoolScalingStateSchema,
    lastScaleAt: z.string().datetime().nullable(),
    cooldownRemainingMs: z.number().int().nonnegative(),
  }),
});

export type WorkerPoolScalingState = z.infer<typeof WorkerPoolScalingStateSchema>;
export type WorkerPoolStatus = z.infer<typeof WorkerPoolStatusSchema>;
