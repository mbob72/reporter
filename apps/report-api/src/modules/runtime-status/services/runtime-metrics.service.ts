import { Inject, Injectable } from '@nestjs/common';

import { ReportJobQueue } from '../../../report-job.queue';
import { REPORT_JOB_QUEUE_TOKEN } from '../../../reporting.tokens';
import { WorkerPoolStateService } from './worker-pool-state.service';

function scalingStateMetricValue(current: string, expected: string): number {
  return current === expected ? 1 : 0;
}

@Injectable()
export class RuntimeMetricsService {
  constructor(
    @Inject(REPORT_JOB_QUEUE_TOKEN)
    private readonly reportJobQueue: ReportJobQueue,
    @Inject(WorkerPoolStateService)
    private readonly stateService: WorkerPoolStateService,
  ) {}

  async renderPrometheusMetrics(): Promise<string> {
    const queueCounters = await this.reportJobQueue.getJobCounts();
    const nowMs = Date.now();
    const snapshot = this.stateService.getSnapshot(nowMs);
    const busyWorkers = Math.min(snapshot.actualWorkers, queueCounters.active);
    const idleWorkers = Math.max(0, snapshot.actualWorkers - busyWorkers);
    const cooldownRemainingMs = snapshot.cooldownUntilMs
      ? Math.max(0, snapshot.cooldownUntilMs - nowMs)
      : 0;
    const memory = process.memoryUsage();

    return [
      '# HELP report_queue_waiting_jobs Count of waiting report jobs in BullMQ queue.',
      '# TYPE report_queue_waiting_jobs gauge',
      `report_queue_waiting_jobs ${queueCounters.waiting}`,
      '# HELP report_queue_active_jobs Count of active report jobs in BullMQ queue.',
      '# TYPE report_queue_active_jobs gauge',
      `report_queue_active_jobs ${queueCounters.active}`,
      '# HELP report_queue_completed_jobs Count of completed report jobs in BullMQ queue.',
      '# TYPE report_queue_completed_jobs gauge',
      `report_queue_completed_jobs ${queueCounters.completed}`,
      '# HELP report_queue_failed_jobs Count of failed report jobs in BullMQ queue.',
      '# TYPE report_queue_failed_jobs gauge',
      `report_queue_failed_jobs ${queueCounters.failed}`,
      '# HELP report_queue_delayed_jobs Count of delayed report jobs in BullMQ queue.',
      '# TYPE report_queue_delayed_jobs gauge',
      `report_queue_delayed_jobs ${queueCounters.delayed}`,
      '# HELP report_worker_pool_target_workers Target number of workers defined by autoscaling policy.',
      '# TYPE report_worker_pool_target_workers gauge',
      `report_worker_pool_target_workers ${snapshot.targetWorkers}`,
      '# HELP report_worker_pool_actual_workers Current application-level worker pool size.',
      '# TYPE report_worker_pool_actual_workers gauge',
      `report_worker_pool_actual_workers ${snapshot.actualWorkers}`,
      '# HELP report_worker_pool_busy_workers Busy workers based on queue active jobs.',
      '# TYPE report_worker_pool_busy_workers gauge',
      `report_worker_pool_busy_workers ${busyWorkers}`,
      '# HELP report_worker_pool_idle_workers Idle workers based on actual minus busy.',
      '# TYPE report_worker_pool_idle_workers gauge',
      `report_worker_pool_idle_workers ${idleWorkers}`,
      '# HELP report_worker_pool_cooldown_remaining_ms Remaining cooldown time in milliseconds.',
      '# TYPE report_worker_pool_cooldown_remaining_ms gauge',
      `report_worker_pool_cooldown_remaining_ms ${cooldownRemainingMs}`,
      '# HELP report_worker_pool_scaling_state Autoscaling state as one-hot gauges.',
      '# TYPE report_worker_pool_scaling_state gauge',
      `report_worker_pool_scaling_state{state="stable"} ${scalingStateMetricValue(snapshot.scalingState, 'stable')}`,
      `report_worker_pool_scaling_state{state="scaling_up"} ${scalingStateMetricValue(snapshot.scalingState, 'scaling_up')}`,
      `report_worker_pool_scaling_state{state="scaling_down"} ${scalingStateMetricValue(snapshot.scalingState, 'scaling_down')}`,
      `report_worker_pool_scaling_state{state="cooldown"} ${scalingStateMetricValue(snapshot.scalingState, 'cooldown')}`,
      '# HELP process_resident_memory_bytes Resident set size in bytes.',
      '# TYPE process_resident_memory_bytes gauge',
      `process_resident_memory_bytes ${memory.rss}`,
      '# HELP process_heap_used_bytes Process heap used in bytes.',
      '# TYPE process_heap_used_bytes gauge',
      `process_heap_used_bytes ${memory.heapUsed}`,
      '# HELP process_heap_total_bytes Process heap total in bytes.',
      '# TYPE process_heap_total_bytes gauge',
      `process_heap_total_bytes ${memory.heapTotal}`,
      '',
    ].join('\n');
  }
}
