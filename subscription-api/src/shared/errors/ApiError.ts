import { ErrorCodes, type ErrorCode } from './errorCodes';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details: unknown;

  constructor(message: string, statusCode = 500, code: ErrorCode = ErrorCodes.INTERNAL_ERROR, details: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
