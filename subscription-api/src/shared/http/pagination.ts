import { ApiError } from '../errors/ApiError';
import { ErrorCodes } from '../errors/errorCodes';

export interface PaginationInput {
  page: number;
  limit: number;
  offset: number;
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError('Pagination parameters must be positive integers', 400, ErrorCodes.VALIDATION_ERROR);
  }

  return parsed;
}

export function parsePagination(query: Record<string, unknown>): PaginationInput {
  const page = parsePositiveInteger(query.page, 1);
  const limit = parsePositiveInteger(query.limit, 10);

  if (limit > 100) {
    throw new ApiError('Pagination limit cannot be greater than 100', 400, ErrorCodes.VALIDATION_ERROR);
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

export function getTotalPages(total: number, limit: number): number {
  return total === 0 ? 0 : Math.ceil(total / limit);
}
