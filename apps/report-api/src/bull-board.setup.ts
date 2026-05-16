import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { type INestApplication, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

import { ReportJobQueue } from './report-job.queue';
import { REPORT_JOB_QUEUE_TOKEN } from './reporting.tokens';

function resolveBullBoardBasePath(): string {
  const rawPath = process.env.BULL_BOARD_BASE_PATH?.trim() || '/admin/queues';
  return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
}

function isBullBoardEnabled(): boolean {
  const rawFlag = process.env.BULL_BOARD_ENABLED?.trim().toLowerCase();
  if (!rawFlag) {
    return true;
  }

  return rawFlag === '1' || rawFlag === 'true' || rawFlag === 'yes';
}

function resolveAuthCredentials(): { username: string; password: string } | null {
  const username = process.env.BULL_BOARD_USERNAME?.trim();
  const password = process.env.BULL_BOARD_PASSWORD?.trim();

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

function requireBasicAuth(
  credentials: { username: string; password: string },
  realm: string,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const header = req.header('authorization');
    if (!header || !header.toLowerCase().startsWith('basic ')) {
      res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
      res.status(401).send('Authentication required');
      return;
    }

    const encodedCredentials = header.slice(6).trim();
    const decoded = Buffer.from(encodedCredentials, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const username = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : decoded;
    const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';

    const usernameMatches = timingSafeEqual(username, credentials.username);
    const passwordMatches = timingSafeEqual(password, credentials.password);

    if (!usernameMatches || !passwordMatches) {
      res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
      res.status(401).send('Invalid credentials');
      return;
    }

    next();
  };
}

export function setupBullBoard(app: INestApplication): void {
  const logger = new Logger('BullBoardSetup');
  if (!isBullBoardEnabled()) {
    logger.log('bull-board is disabled by BULL_BOARD_ENABLED');
    return;
  }

  const credentials = resolveAuthCredentials();
  if (!credentials) {
    logger.warn(
      'bull-board is disabled: BULL_BOARD_USERNAME/BULL_BOARD_PASSWORD are not configured',
    );
    return;
  }

  const reportJobQueue = app.get<ReportJobQueue>(REPORT_JOB_QUEUE_TOKEN);
  const serverAdapter = new ExpressAdapter();
  const basePath = resolveBullBoardBasePath();
  serverAdapter.setBasePath(basePath);

  createBullBoard({
    queues: [new BullMQAdapter(reportJobQueue.getQueue())],
    serverAdapter,
  });

  const expressApp = app.getHttpAdapter().getInstance() as {
    use: (
      path: string,
      ...handlers: Array<(req: Request, res: Response, next: NextFunction) => void>
    ) => void;
  };

  expressApp.use(
    basePath,
    requireBasicAuth(credentials, 'Report Queue Admin'),
    serverAdapter.getRouter(),
  );
  logger.log(`bull-board is available on ${basePath}`);
}
