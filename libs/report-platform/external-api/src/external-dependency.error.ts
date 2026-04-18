export type ExternalDependencyErrorCategory =
  | 'network'
  | 'timeout'
  | 'http'
  | 'invalid_input'
  | 'invalid_response';

export type ExternalDependencyErrorParams = {
  serviceKey: string;
  category: ExternalDependencyErrorCategory;
  message: string;
  httpStatus?: number;
  cause?: unknown;
};

export class ExternalDependencyError extends Error {
  readonly serviceKey: string;
  readonly category: ExternalDependencyErrorCategory;
  readonly httpStatus: number | undefined;
  readonly cause: unknown;

  constructor(params: ExternalDependencyErrorParams) {
    super(params.message);

    this.name = 'ExternalDependencyError';
    this.serviceKey = params.serviceKey;
    this.category = params.category;
    this.httpStatus = params.httpStatus;
    this.cause = params.cause;
  }
}

export function isExternalDependencyError(
  error: unknown,
): error is ExternalDependencyError {
  return error instanceof ExternalDependencyError;
}
