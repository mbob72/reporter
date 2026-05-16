import { Controller, Get, HttpCode, Inject } from '@nestjs/common';

import { Roles } from './common/auth/roles.decorator';
import { WorkerPoolStatusService } from './modules/runtime-status/services/worker-pool-status.service';

@Controller('admin')
export class RuntimeStatusController {
  constructor(
    @Inject(WorkerPoolStatusService)
    private readonly workerPoolStatusService: WorkerPoolStatusService,
  ) {}

  @Get('worker-pool/status')
  @Roles('Admin')
  @HttpCode(200)
  async getWorkerPoolStatus() {
    return this.workerPoolStatusService.getStatus();
  }
}
