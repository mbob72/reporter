import * as crypto from 'node:crypto';

import type {
  GeneratedFileStore,
  SaveGeneratedFileInput,
  StoredGeneratedFile,
} from './generated-file-store';

function generateFileId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class InMemoryGeneratedFileStore implements GeneratedFileStore {
  private readonly files = new Map<string, StoredGeneratedFile>();

  async save(input: SaveGeneratedFileInput): Promise<{ fileId: string }> {
    const fileId = generateFileId();
    const storedFile: StoredGeneratedFile = {
      id: fileId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      bytes: new Uint8Array(input.bytes),
      createdAt: new Date().toISOString(),
    };

    this.files.set(fileId, storedFile);

    return { fileId };
  }

  async get(fileId: string): Promise<StoredGeneratedFile | undefined> {
    return this.files.get(fileId);
  }
}
