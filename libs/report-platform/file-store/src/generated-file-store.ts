export type StoredGeneratedFile = {
  id: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  createdAt: string;
};

export type SaveGeneratedFileInput = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

export interface GeneratedFileStore {
  save(input: SaveGeneratedFileInput): Promise<{ fileId: string }>;
  get(fileId: string): Promise<StoredGeneratedFile | undefined>;
}
