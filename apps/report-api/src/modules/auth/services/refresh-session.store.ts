import { createHash, randomUUID } from 'node:crypto';

export type RefreshSessionRecord = {
  tokenId: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
};

export class RefreshSessionStore {
  private readonly sessionsById = new Map<string, RefreshSessionRecord>();
  private readonly sessionsByHash = new Map<string, string>();

  issue(input: { userId: string; refreshToken: string; expiresAt: Date }): RefreshSessionRecord {
    const tokenId = randomUUID();
    const tokenHash = hashToken(input.refreshToken);
    const now = new Date();
    const record: RefreshSessionRecord = {
      tokenId,
      tokenHash,
      userId: input.userId,
      expiresAt: input.expiresAt,
      createdAt: now,
      revokedAt: null,
      replacedByTokenId: null,
    };

    this.sessionsById.set(record.tokenId, record);
    this.sessionsByHash.set(tokenHash, record.tokenId);

    return record;
  }

  findByRefreshToken(refreshToken: string): RefreshSessionRecord | null {
    const tokenHash = hashToken(refreshToken);
    const tokenId = this.sessionsByHash.get(tokenHash);

    if (!tokenId) {
      return null;
    }

    return this.sessionsById.get(tokenId) ?? null;
  }

  revokeByTokenId(tokenId: string, replacementTokenId?: string): void {
    const session = this.sessionsById.get(tokenId);

    if (!session || session.revokedAt) {
      return;
    }

    session.revokedAt = new Date();
    session.replacedByTokenId = replacementTokenId ?? null;
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
