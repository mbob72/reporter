import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { ReportWorkerRuntimeService } from './modules/report-worker/services/report-worker-runtime.service';
import { WorkerAppModule } from './modules/worker-app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const runtime = app.get(ReportWorkerRuntimeService);
  runtime.start();

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

void bootstrap();
