import { Controller, Get, Header, HttpCode, Inject } from '@nestjs/common';

import { Roles } from './common/auth/roles.decorator';
import { RuntimeMetricsService } from './modules/runtime-status/services/runtime-metrics.service';
import { WorkerPoolStatusService } from './modules/runtime-status/services/worker-pool-status.service';

@Controller('admin')
export class RuntimeStatusController {
  constructor(
    @Inject(WorkerPoolStatusService)
    private readonly workerPoolStatusService: WorkerPoolStatusService,
    @Inject(RuntimeMetricsService)
    private readonly runtimeMetricsService: RuntimeMetricsService,
  ) {}

  @Get('worker-pool/status')
  @Roles('Admin')
  @HttpCode(200)
  async getWorkerPoolStatus() {
    return this.workerPoolStatusService.getStatus();
  }

  @Get('metrics')
  @Roles('Admin')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @HttpCode(200)
  async getRuntimeMetrics(): Promise<string> {
    return this.runtimeMetricsService.renderPrometheusMetrics();
  }
}
