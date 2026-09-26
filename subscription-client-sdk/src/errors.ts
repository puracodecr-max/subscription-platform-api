import type { EntitlementResult } from './types';

export class SdkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SdkError';
  }
}

export class InvalidConfigurationError extends SdkError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidConfigurationError';
  }
}

export class InvalidEntitlementInputError extends SdkError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEntitlementInputError';
  }
}

export class NetworkError extends SdkError {
  readonly cause: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

export class TimeoutError extends NetworkError {
  constructor(message = 'Request timed out', cause?: unknown) {
    super(message, cause);
    this.name = 'TimeoutError';
  }
}

export class HttpError extends SdkError {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown) {
    super(`Subscription API returned HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

export class EntitlementDeniedError extends SdkError {
  readonly result: EntitlementResult;
  constructor(result: EntitlementResult) {
    super(`Access denied: ${result.reason ?? 'unknown reason'}`);
    this.name = 'EntitlementDeniedError';
    this.result = result;
  }
}

export class UnexpectedResponseError extends SdkError {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown) {
    super(`Unexpected response: HTTP ${status}`);
    this.name = 'UnexpectedResponseError';
    this.status = status;
    this.body = body;
  }
}
