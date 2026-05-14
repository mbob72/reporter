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

type JwtRuntimeConfig = {
  secret: string;
  verifyOptions: VerifyOptions;
  algorithm: Algorithm;
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

export function getJwtRuntimeConfig(): JwtRuntimeConfig {
  const secret = process.env.JWT_SECRET ?? 'dev-secret-change-me';
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
  };
}

export function getJwtModuleOptions(): JwtModuleOptions {
  const config = getJwtRuntimeConfig();

  return {
    secret: config.secret,
    signOptions: {
      algorithm: config.algorithm,
    },
  };
}
