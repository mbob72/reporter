import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

function parsePort(rawPort: string | undefined, fallbackPort: number): number {
  const parsedPort = Number.parseInt(rawPort ?? '', 10);
  return Number.isFinite(parsedPort) ? parsedPort : fallbackPort;
}

function parseCorsOrigins(rawOrigins: string | undefined): string[] {
  return (rawOrigins ?? 'http://localhost:4200,http://127.0.0.1:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const host = process.env.API_HOST ?? '0.0.0.0';
  const port = parsePort(process.env.API_PORT, 3000);
  const allowedOrigins = parseCorsOrigins(process.env.API_CORS_ORIGINS);

  app.enableCors({
    origin: allowedOrigins,
  });

  await app.listen(port, host);
}

bootstrap();
