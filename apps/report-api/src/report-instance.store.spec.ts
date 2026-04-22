import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { FileSystemReportInstanceStore } from './report-instance.store';
import type { InternalReportInstanceRecord } from './report-instance.types';

const REPORT_CODE = 'simple-sales-summary';
const INSTANCE_ID = 'instance-1';

function buildRecord(
  overrides: Partial<InternalReportInstanceRecord>,
): InternalReportInstanceRecord {
  return {
    id: 'record-id',
    reportCode: REPORT_CODE,
    status: 'queued',
    stage: 'queued',
    progressPercent: 0,
    createdAt: '2026-04-22T10:00:00.000Z',
    ...overrides,
  };
}

describe('FileSystemReportInstanceStore', () => {
  let rootDir: string;
  let store: FileSystemReportInstanceStore;

  beforeEach(async () => {
    rootDir = await fs.mkdtemp(join(tmpdir(), 'report-instance-store-'));
    store = new FileSystemReportInstanceStore(rootDir);
  });

  afterEach(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  it('createQueuedInstance creates queued instance with stage queued and progress 0', async () => {
    const created = await store.createQueuedInstance({
      reportInstanceId: INSTANCE_ID,
      reportCode: REPORT_CODE,
    });

    expect(created.id).toBe(INSTANCE_ID);
    expect(created.reportCode).toBe(REPORT_CODE);
    expect(created.status).toBe('queued');
    expect(created.stage).toBe('queued');
    expect(created.progressPercent).toBe(0);
  });

  it('get returns record and returns undefined for unknown id', async () => {
    await store.createQueuedInstance({
      reportInstanceId: INSTANCE_ID,
      reportCode: REPORT_CODE,
    });

    const found = await store.get(INSTANCE_ID);
    const missing = await store.get('missing-id');

    expect(found?.id).toBe(INSTANCE_ID);
    expect(missing).toBeUndefined();
  });

  it('markRunning moves instance to running and sets startedAt when absent', async () => {
    await store.createQueuedInstance({
      reportInstanceId: INSTANCE_ID,
      reportCode: REPORT_CODE,
    });

    const updated = await store.markRunning(INSTANCE_ID);

    expect(updated?.status).toBe('running');
    expect(updated?.startedAt).toBeTypeOf('string');
  });

  it.each(['completed', 'failed'] as const)(
    'markRunning does not overwrite terminal state %s',
    async (terminalState) => {
      await store.createQueuedInstance({
        reportInstanceId: INSTANCE_ID,
        reportCode: REPORT_CODE,
      });

      if (terminalState === 'completed') {
        await store.markCompleted(
          INSTANCE_ID,
          {
            kind: 'downloadable-file',
            fileName: 'done.xlsx',
            byteLength: 4,
            downloadUrl: '/generated-files/instance-1',
          },
          {
            artifactId: INSTANCE_ID,
            fileName: 'done.xlsx',
            mimeType: 'application/octet-stream',
            byteLength: 4,
          },
        );
      } else {
        await store.markFailed(INSTANCE_ID, 'Boom');
      }

      const after = await store.markRunning(INSTANCE_ID);
      expect(after?.status).toBe(terminalState);
    },
  );

  it('updateProgress updates stage/progress and clamps to 0..100', async () => {
    await store.createQueuedInstance({
      reportInstanceId: INSTANCE_ID,
      reportCode: REPORT_CODE,
    });

    const low = await store.updateProgress(INSTANCE_ID, 'generating', -20);
    const high = await store.updateProgress(INSTANCE_ID, 'generating', 150);

    expect(low?.status).toBe('running');
    expect(low?.stage).toBe('generating');
    expect(low?.progressPercent).toBe(0);
    expect(high?.progressPercent).toBe(100);
  });

  it.each(['completed', 'failed'] as const)(
    'updateProgress does not change terminal state %s',
    async (terminalState) => {
      await store.createQueuedInstance({
        reportInstanceId: INSTANCE_ID,
        reportCode: REPORT_CODE,
      });

      if (terminalState === 'completed') {
        await store.markCompleted(
          INSTANCE_ID,
          {
            kind: 'downloadable-file',
            fileName: 'done.xlsx',
            byteLength: 1,
            downloadUrl: '/generated-files/instance-1',
          },
          {
            artifactId: INSTANCE_ID,
            fileName: 'done.xlsx',
            mimeType: 'application/octet-stream',
            byteLength: 1,
          },
        );
      } else {
        await store.markFailed(INSTANCE_ID, 'Error');
      }

      const after = await store.updateProgress(INSTANCE_ID, 'generating', 50);
      expect(after?.status).toBe(terminalState);
    },
  );

  it('markCompleted sets completed/done/100 and stores result/artifact metadata with finishedAt', async () => {
    await store.createQueuedInstance({
      reportInstanceId: INSTANCE_ID,
      reportCode: REPORT_CODE,
    });

    const result = {
      kind: 'downloadable-file' as const,
      fileName: 'sales.xlsx',
      byteLength: 33,
      downloadUrl: '/generated-files/instance-1',
    };
    const artifact = {
      artifactId: INSTANCE_ID,
      fileName: 'sales.xlsx',
      mimeType: 'application/octet-stream',
      byteLength: 33,
    };

    const completed = await store.markCompleted(INSTANCE_ID, result, artifact);

    expect(completed?.status).toBe('completed');
    expect(completed?.stage).toBe('done');
    expect(completed?.progressPercent).toBe(100);
    expect(completed?.result).toEqual(result);
    expect(completed?.artifactId).toBe(artifact.artifactId);
    expect(completed?.fileName).toBe(artifact.fileName);
    expect(completed?.mimeType).toBe(artifact.mimeType);
    expect(completed?.byteLength).toBe(artifact.byteLength);
    expect(completed?.finishedAt).toBeTypeOf('string');
  });

  it('markFailed sets failed/errorMessage and finishedAt', async () => {
    await store.createQueuedInstance({
      reportInstanceId: INSTANCE_ID,
      reportCode: REPORT_CODE,
    });

    const failed = await store.markFailed(INSTANCE_ID, 'Generation failed');

    expect(failed?.status).toBe('failed');
    expect(failed?.stage).toBe('failed');
    expect(failed?.errorMessage).toBe('Generation failed');
    expect(failed?.finishedAt).toBeTypeOf('string');
  });

  it('saveArtifact writes bytes to disk and returns artifact metadata', async () => {
    await store.createQueuedInstance({
      reportInstanceId: INSTANCE_ID,
      reportCode: REPORT_CODE,
    });

    const bytes = new Uint8Array([1, 2, 3, 4]);
    const artifact = await store.saveArtifact({
      reportInstanceId: INSTANCE_ID,
      fileName: 'report.bin',
      mimeType: 'application/octet-stream',
      bytes,
    });

    const artifactPath = resolve(rootDir, REPORT_CODE, INSTANCE_ID, 'artifact.bin');
    const stored = await fs.readFile(artifactPath);

    expect(artifact).toEqual({
      artifactId: INSTANCE_ID,
      fileName: 'report.bin',
      mimeType: 'application/octet-stream',
      byteLength: 4,
    });
    expect(Array.from(stored)).toEqual([1, 2, 3, 4]);
  });

  it('saveArtifact throws for unknown report instance', async () => {
    await expect(
      store.saveArtifact({
        reportInstanceId: 'missing-id',
        fileName: 'report.bin',
        mimeType: 'application/octet-stream',
        bytes: new Uint8Array([1]),
      }),
    ).rejects.toThrow('Unknown report instance: missing-id');
  });

  it('getArtifact returns stored artifact', async () => {
    await store.createQueuedInstance({
      reportInstanceId: INSTANCE_ID,
      reportCode: REPORT_CODE,
    });

    const bytes = new Uint8Array([5, 6, 7]);
    const artifact = await store.saveArtifact({
      reportInstanceId: INSTANCE_ID,
      fileName: 'report.xlsx',
      mimeType: 'application/octet-stream',
      bytes,
    });
    await store.markCompleted(
      INSTANCE_ID,
      {
        kind: 'downloadable-file',
        fileName: 'report.xlsx',
        byteLength: bytes.byteLength,
        downloadUrl: `/generated-files/${artifact.artifactId}`,
      },
      artifact,
    );

    const storedArtifact = await store.getArtifact(INSTANCE_ID);

    expect(storedArtifact?.id).toBe(INSTANCE_ID);
    expect(storedArtifact?.fileName).toBe('report.xlsx');
    expect(storedArtifact?.mimeType).toBe('application/octet-stream');
    expect(Array.from(storedArtifact?.bytes ?? [])).toEqual([5, 6, 7]);
  });

  it('getArtifact returns undefined when artifact is absent', async () => {
    await store.createQueuedInstance({
      reportInstanceId: INSTANCE_ID,
      reportCode: REPORT_CODE,
    });

    const artifact = await store.getArtifact(INSTANCE_ID);
    expect(artifact).toBeUndefined();
  });

  it('listByReportCode returns empty array when report folder does not exist', async () => {
    const records = await store.listByReportCode('unknown-report');
    expect(records).toEqual([]);
  });

  it('listByReportCode sorts by createdAt desc and skips broken/invalid records', async () => {
    const reportDir = resolve(rootDir, REPORT_CODE);
    const newest = buildRecord({
      id: 'newest',
      createdAt: '2026-04-22T11:00:00.000Z',
    });
    const oldest = buildRecord({
      id: 'oldest',
      createdAt: '2026-04-22T09:00:00.000Z',
    });

    await fs.mkdir(resolve(reportDir, newest.id), { recursive: true });
    await fs.writeFile(
      resolve(reportDir, newest.id, 'meta.json'),
      `${JSON.stringify(newest)}\n`,
      'utf-8',
    );

    await fs.mkdir(resolve(reportDir, oldest.id), { recursive: true });
    await fs.writeFile(
      resolve(reportDir, oldest.id, 'meta.json'),
      `${JSON.stringify(oldest)}\n`,
      'utf-8',
    );

    await fs.mkdir(resolve(reportDir, 'broken-json'), { recursive: true });
    await fs.writeFile(resolve(reportDir, 'broken-json', 'meta.json'), '{', 'utf-8');

    await fs.mkdir(resolve(reportDir, 'invalid-shape'), { recursive: true });
    await fs.writeFile(
      resolve(reportDir, 'invalid-shape', 'meta.json'),
      `${JSON.stringify({ id: 'invalid' })}\n`,
      'utf-8',
    );

    const listed = await store.listByReportCode(REPORT_CODE);
    expect(listed.map((record) => record.id)).toEqual(['newest', 'oldest']);
  });

  it('serializes concurrent updates for one instance without corrupting stored record', async () => {
    await store.createQueuedInstance({
      reportInstanceId: INSTANCE_ID,
      reportCode: REPORT_CODE,
    });

    await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        store.updateProgress(INSTANCE_ID, 'generating', index),
      ),
    );

    const metaPath = resolve(rootDir, REPORT_CODE, INSTANCE_ID, 'meta.json');
    const rawMeta = await fs.readFile(metaPath, 'utf-8');
    const parsedMeta = JSON.parse(rawMeta) as Record<string, unknown>;
    const record = await store.get(INSTANCE_ID);

    expect(parsedMeta.id).toBe(INSTANCE_ID);
    expect(parsedMeta.reportCode).toBe(REPORT_CODE);
    expect(record?.status).toBe('running');
    expect(record?.stage).toBe('generating');
    expect(record?.progressPercent).toBe(49);
  });
});
