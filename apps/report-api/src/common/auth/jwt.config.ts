import type { JwtModuleOptions } from '@nestjs/jwt';
import type { Algorithm, VerifyOptions } from 'jsonwebtoken';

const JWT_ALGORITHMS = new Set<Algorithm>([
  'HS256',
  'HS384',
  'HS512',
  'RS256',
  'RS384',
  'RS512',
  'ES256',
  'ES384',
  'ES512',
  'PS256',
  'PS384',
  'PS512',
  'none',
]);

export type JwtTokenKind = 'access' | 'refresh';

type JwtRuntimeConfig = {
  secret: string;
  verifyOptions: VerifyOptions;
  algorithm: Algorithm;
  expiresIn: string;
};

function normalizeAlgorithm(rawAlgorithm: string | undefined): Algorithm {
  const candidate = (rawAlgorithm ?? 'HS256') as Algorithm;

  if (!JWT_ALGORITHMS.has(candidate)) {
    return 'HS256';
  }

  return candidate;
}

function parseClockTolerance(rawClockTolerance: string | undefined): number | undefined {
  if (!rawClockTolerance) {
    return undefined;
  }

  const parsedTolerance = Number(rawClockTolerance);

  if (!Number.isFinite(parsedTolerance) || parsedTolerance < 0) {
    return undefined;
  }

  return parsedTolerance;
}

function getRawSecret(tokenKind: JwtTokenKind): string {
  if (tokenKind === 'refresh') {
    return process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-secret-change-me';
  }

  return process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-secret-change-me';
}

function getRawExpiresIn(tokenKind: JwtTokenKind): string {
  if (tokenKind === 'refresh') {
    return process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
  }

  return process.env.JWT_ACCESS_EXPIRES_IN ?? process.env.JWT_EXPIRES_IN ?? '15m';
}

export function getJwtRuntimeConfig(tokenKind: JwtTokenKind = 'access'): JwtRuntimeConfig {
  const secret = getRawSecret(tokenKind);
  const issuer = process.env.JWT_ISSUER;
  const audience = process.env.JWT_AUDIENCE;
  const algorithm = normalizeAlgorithm(process.env.JWT_ALG);
  const clockTolerance = parseClockTolerance(process.env.JWT_CLOCK_TOLERANCE);

  const verifyOptions: VerifyOptions = {
    algorithms: [algorithm],
  };

  if (issuer) {
    verifyOptions.issuer = issuer;
  }

  if (audience) {
    verifyOptions.audience = audience;
  }

  if (clockTolerance !== undefined) {
    verifyOptions.clockTolerance = clockTolerance;
  }

  return {
    secret,
    verifyOptions,
    algorithm,
    expiresIn: getRawExpiresIn(tokenKind),
  };
}

export function getJwtModuleOptions(tokenKind: JwtTokenKind = 'access'): JwtModuleOptions {
  const config = getJwtRuntimeConfig(tokenKind);

  return {
    secret: config.secret,
    signOptions: {
      algorithm: config.algorithm,
    },
  };
}
