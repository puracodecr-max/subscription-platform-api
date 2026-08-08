import { ApiError } from './ApiError';
import { ErrorCodes, type ErrorCode } from './errorCodes';

interface PgErrorLike {
  code?: string;
  constraint?: string;
  detail?: string;
  message?: string;
}

function isPgErrorLike(error: unknown): error is PgErrorLike {
  return typeof error === 'object' && error !== null && 'code' in error;
}

export function mapDatabaseError(error: unknown): ApiError {
  if (!isPgErrorLike(error)) {
    return new ApiError('Database operation failed');
  }

  if (error.code === '23505') {
    if (error.constraint === 'subscriptions_one_active_per_scope') {
      return new ApiError(
        'An active subscription already exists for this customer and application scope',
        409,
        ErrorCodes.SUBSCRIPTION_ALREADY_EXISTS
      );
    }

    return new ApiError('A duplicate record already exists', 409, ErrorCodes.DATABASE_CONFLICT);
  }

  if (error.code === '23503') {
    return new ApiError('Referenced record does not exist', 400, ErrorCodes.DATABASE_FOREIGN_KEY_VIOLATION);
  }

  if (error.code === '23514') {
    return new ApiError('Database check constraint failed', 400, ErrorCodes.DATABASE_CHECK_VIOLATION);
  }

  if (error.code === 'P0001') {
    const message = String(error.message ?? 'Database business rule failed');
    const prefix = message.split(':')[0].trim();
    const mappedCode = mapBusinessRuleCode(prefix);

    return new ApiError(message, getBusinessRuleStatus(mappedCode), mappedCode);
  }

  return new ApiError('Database operation failed');
}

function mapBusinessRuleCode(code: string): ErrorCode {
  const knownCodes = new Set<string>(Object.values(ErrorCodes));
  return knownCodes.has(code) ? (code as ErrorCode) : ErrorCodes.DATABASE_CHECK_VIOLATION;
}

function getBusinessRuleStatus(code: ErrorCode): number {
  if (
    code === ErrorCodes.INVOICE_ALREADY_EXISTS ||
    code === ErrorCodes.INVOICE_ALREADY_PAID ||
    code === ErrorCodes.INVOICE_NOT_ADJUSTABLE ||
    code === ErrorCodes.INVOICE_NOT_PENALIZABLE ||
    code === ErrorCodes.PAYMENT_ALREADY_PROCESSED ||
    code === ErrorCodes.PAYMENT_NOT_CONFIRMED ||
    code === ErrorCodes.PENALTY_NOT_WAIVABLE ||
    code === ErrorCodes.EXTENSION_NOT_CANCELLABLE ||
    code === ErrorCodes.SUBSCRIPTION_NOT_REACTIVABLE ||
    code === ErrorCodes.ADMINISTRATIVE_SUSPENSION ||
    code === ErrorCodes.OUTSTANDING_BALANCE ||
    code === ErrorCodes.SUBSCRIPTION_ALREADY_EXISTS
  ) {
    return 409;
  }

  if (
    code === ErrorCodes.CUSTOMER_NOT_FOUND ||
    code === ErrorCodes.APPLICATION_NOT_FOUND ||
    code === ErrorCodes.PLAN_NOT_FOUND ||
    code === ErrorCodes.SUBSCRIPTION_NOT_FOUND ||
    code === ErrorCodes.INVOICE_NOT_FOUND ||
    code === ErrorCodes.PAYMENT_NOT_FOUND ||
    code === ErrorCodes.PENALTY_RULE_NOT_FOUND ||
    code === ErrorCodes.PENALTY_NOT_FOUND ||
    code === ErrorCodes.EXTENSION_NOT_FOUND
  ) {
    return 404;
  }

  return 400;
}
