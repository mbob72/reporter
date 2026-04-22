import * as fs from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { DownloadableFileResult } from '@report-platform/contracts';

import type { InternalReportInstanceRecord } from './report-instance.types';

type UpdateRecord = Partial<InternalReportInstanceRecord>;

type SaveArtifactInput = {
  reportInstanceId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

type StoredArtifact = {
  id: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function toResultOrUndefined(value: unknown): DownloadableFileResult | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    value.kind !== 'downloadable-file' ||
    typeof value.fileName !== 'string' ||
    typeof value.downloadUrl !== 'string' ||
    typeof value.byteLength !== 'number'
  ) {
    return undefined;
  }

  return {
    kind: 'downloadable-file',
    fileName: value.fileName,
    downloadUrl: value.downloadUrl,
    byteLength: value.byteLength,
  };
}

function parseRecord(content: string): InternalReportInstanceRecord | undefined {
  try {
    const parsed = JSON.parse(content) as unknown;

    if (!isRecord(parsed)) {
      return undefined;
    }

    const id = toStringOrUndefined(parsed.id);
    const reportCode = toStringOrUndefined(parsed.reportCode);
    const status = toStringOrUndefined(parsed.status);
    const stage = toStringOrUndefined(parsed.stage);
    const createdAt = toStringOrUndefined(parsed.createdAt);
    const progressPercent = toNumberOrUndefined(parsed.progressPercent);

    if (!id || !reportCode || !status || !stage || !createdAt || progressPercent === undefined) {
      return undefined;
    }

    return {
      id,
      reportCode,
      status: status as InternalReportInstanceRecord['status'],
      stage: stage as InternalReportInstanceRecord['stage'],
      progressPercent,
      createdAt,
      startedAt: toStringOrUndefined(parsed.startedAt),
      finishedAt: toStringOrUndefined(parsed.finishedAt),
      errorMessage: toStringOrUndefined(parsed.errorMessage),
      artifactId: toStringOrUndefined(parsed.artifactId),
      fileName: toStringOrUndefined(parsed.fileName),
      mimeType: toStringOrUndefined(parsed.mimeType),
      byteLength: toNumberOrUndefined(parsed.byteLength),
      result: toResultOrUndefined(parsed.result),
    };
  } catch {
    return undefined;
  }
}

function resolveStorageRootDir(rootDir?: string): string {
  const configuredPath = (rootDir ?? process.env.GENERATED_REPORTS_DIR ?? '').trim();

  if (configuredPath.length > 0) {
    return resolve(configuredPath);
  }

  return resolve(process.cwd(), '.generated-reports');
}

export class FileSystemReportInstanceStore {
  private readonly reportCodeByInstanceId = new Map<string, string>();
  private readonly instanceLocks = new Map<string, Promise<void>>();
  private readonly rootDir: string;

  constructor(rootDir?: string) {
    this.rootDir = resolveStorageRootDir(rootDir);
  }

  async createQueuedInstance(params: {
    reportInstanceId: string;
    reportCode: string;
  }): Promise<InternalReportInstanceRecord> {
    return this.withInstanceLock(params.reportInstanceId, async () => {
      const now = new Date().toISOString();
      const record: InternalReportInstanceRecord = {
        id: params.reportInstanceId,
        reportCode: params.reportCode,
        status: 'queued',
        stage: 'queued',
        progressPercent: 0,
        createdAt: now,
      };

      await this.writeRecord(record);

      return record;
    });
  }

  async markRunning(reportInstanceId: string): Promise<InternalReportInstanceRecord | undefined> {
    return this.update(reportInstanceId, (current) => {
      if (current.status === 'completed' || current.status === 'failed') {
        return {};
      }

      return {
        status: 'running',
        startedAt: current.startedAt ?? new Date().toISOString(),
      };
    });
  }

  async updateProgress(
    reportInstanceId: string,
    stage: InternalReportInstanceRecord['stage'],
    progressPercent: number,
  ): Promise<InternalReportInstanceRecord | undefined> {
    const normalizedProgress = Math.max(0, Math.min(100, progressPercent));

    return this.update(reportInstanceId, (current) => {
      if (current.status === 'completed' || current.status === 'failed') {
        return {};
      }

      return {
        status: 'running',
        stage,
        progressPercent: normalizedProgress,
      };
    });
  }

  async markCompleted(
    reportInstanceId: string,
    result: DownloadableFileResult,
    artifact: {
      artifactId: string;
      fileName: string;
      mimeType: string;
      byteLength: number;
    },
  ): Promise<InternalReportInstanceRecord | undefined> {
    return this.update(reportInstanceId, (current) => {
      if (current.status === 'completed' || current.status === 'failed') {
        return {};
      }

      return {
        status: 'completed',
        stage: 'done',
        progressPercent: 100,
        startedAt: current.startedAt ?? new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        result,
        errorMessage: undefined,
        artifactId: artifact.artifactId,
        fileName: artifact.fileName,
        mimeType: artifact.mimeType,
        byteLength: artifact.byteLength,
      };
    });
  }

  async markFailed(
    reportInstanceId: string,
    errorMessage: string,
  ): Promise<InternalReportInstanceRecord | undefined> {
    return this.update(reportInstanceId, (current) => {
      if (current.status === 'completed' || current.status === 'failed') {
        return {};
      }

      return {
        status: 'failed',
        stage: 'failed',
        startedAt: current.startedAt ?? new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        errorMessage,
      };
    });
  }

  async saveArtifact(input: SaveArtifactInput): Promise<{
    artifactId: string;
    fileName: string;
    mimeType: string;
    byteLength: number;
  }> {
    return this.withInstanceLock(input.reportInstanceId, async () => {
      const record = await this.get(input.reportInstanceId);

      if (!record) {
        throw new Error(`Unknown report instance: ${input.reportInstanceId}`);
      }

      const artifactPath = this.getArtifactPath(record.reportCode, record.id);

      await this.ensureDirectory(dirname(artifactPath));
      await fs.writeFile(artifactPath, Buffer.from(input.bytes));

      return {
        artifactId: input.reportInstanceId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        byteLength: input.bytes.byteLength,
      };
    });
  }

  async get(reportInstanceId: string): Promise<InternalReportInstanceRecord | undefined> {
    const location = await this.resolveInstanceLocation(reportInstanceId);

    if (!location) {
      return undefined;
    }

    const metaPath = this.getMetaPath(location.reportCode, reportInstanceId);

    try {
      const content = await fs.readFile(metaPath, 'utf-8');
      const parsed = parseRecord(content);

      if (!parsed) {
        return undefined;
      }

      this.reportCodeByInstanceId.set(parsed.id, parsed.reportCode);

      return parsed;
    } catch {
      return undefined;
    }
  }

  async getArtifact(artifactId: string): Promise<StoredArtifact | undefined> {
    const record = await this.get(artifactId);

    if (!record || !record.artifactId || !record.fileName || !record.mimeType) {
      return undefined;
    }

    const artifactPath = this.getArtifactPath(record.reportCode, record.id);

    try {
      const bytes = await fs.readFile(artifactPath);

      return {
        id: record.artifactId,
        fileName: record.fileName,
        mimeType: record.mimeType,
        bytes: new Uint8Array(bytes),
        createdAt: record.finishedAt ?? record.createdAt,
      };
    } catch {
      return undefined;
    }
  }

  async listByReportCode(reportCode: string): Promise<InternalReportInstanceRecord[]> {
    const reportDir = resolve(this.rootDir, reportCode);

    if (!(await this.exists(reportDir))) {
      return [];
    }

    const entries = await fs.readdir(reportDir, { withFileTypes: true });
    const records: InternalReportInstanceRecord[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const metaPath = this.getMetaPath(reportCode, entry.name);

      try {
        const content = await fs.readFile(metaPath, 'utf-8');
        const record = parseRecord(content);

        if (!record) {
          continue;
        }

        this.reportCodeByInstanceId.set(record.id, reportCode);
        records.push(record);
      } catch {
        continue;
      }
    }

    records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return records;
  }

  private async update(
    reportInstanceId: string,
    update: UpdateRecord | ((current: InternalReportInstanceRecord) => UpdateRecord),
  ): Promise<InternalReportInstanceRecord | undefined> {
    return this.withInstanceLock(reportInstanceId, async () => {
      const current = await this.get(reportInstanceId);

      if (!current) {
        return undefined;
      }

      const patch = typeof update === 'function' ? update(current) : update;
      const nextRecord = {
        ...current,
        ...patch,
      };

      await this.writeRecord(nextRecord);

      return nextRecord;
    });
  }

  private async writeRecord(record: InternalReportInstanceRecord): Promise<void> {
    const metaPath = this.getMetaPath(record.reportCode, record.id);
    const temporaryMetaPath = `${metaPath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    await this.ensureDirectory(dirname(metaPath));
    await fs.writeFile(temporaryMetaPath, `${JSON.stringify(record, null, 2)}\n`, 'utf-8');
    await fs.rename(temporaryMetaPath, metaPath);
    this.reportCodeByInstanceId.set(record.id, record.reportCode);
  }

  private async withInstanceLock<T>(
    reportInstanceId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = (this.instanceLocks.get(reportInstanceId) ?? Promise.resolve()).catch(
      () => undefined,
    );
    let releaseLock: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const chain = previous.then(() => current);

    this.instanceLocks.set(reportInstanceId, chain);
    await previous;

    try {
      return await operation();
    } finally {
      releaseLock();

      if (this.instanceLocks.get(reportInstanceId) === chain) {
        this.instanceLocks.delete(reportInstanceId);
      }
    }
  }

  private getMetaPath(reportCode: string, reportInstanceId: string): string {
    return resolve(this.rootDir, reportCode, reportInstanceId, 'meta.json');
  }

  private getArtifactPath(reportCode: string, reportInstanceId: string): string {
    return resolve(this.rootDir, reportCode, reportInstanceId, 'artifact.bin');
  }

  private async ensureDirectory(path: string): Promise<void> {
    await fs.mkdir(path, { recursive: true });
  }

  private async resolveInstanceLocation(
    reportInstanceId: string,
  ): Promise<{ reportCode: string } | undefined> {
    const knownReportCode = this.reportCodeByInstanceId.get(reportInstanceId);

    if (knownReportCode) {
      const knownMetaPath = this.getMetaPath(knownReportCode, reportInstanceId);

      if (await this.exists(knownMetaPath)) {
        return { reportCode: knownReportCode };
      }

      this.reportCodeByInstanceId.delete(reportInstanceId);
    }

    if (!(await this.exists(this.rootDir))) {
      return undefined;
    }

    const reportCodeEntries = await fs.readdir(this.rootDir, { withFileTypes: true });

    for (const reportCodeEntry of reportCodeEntries) {
      if (!reportCodeEntry.isDirectory()) {
        continue;
      }

      const candidateMetaPath = this.getMetaPath(reportCodeEntry.name, reportInstanceId);

      if (await this.exists(candidateMetaPath)) {
        this.reportCodeByInstanceId.set(reportInstanceId, reportCodeEntry.name);
        return { reportCode: reportCodeEntry.name };
      }
    }

    return undefined;
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
