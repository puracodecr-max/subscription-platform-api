import type { Request } from 'express';
import { ApiError } from '../errors/ApiError';
import { ErrorCodes } from '../errors/errorCodes';

export function getRequiredParam(req: Request, name: string): string {
  const value = req.params[name];

  if (typeof value !== 'string' || value.length === 0) {
    throw new ApiError(`Missing route parameter: ${name}`, 400, ErrorCodes.VALIDATION_ERROR);
  }

  return value;
}

export function getAuthenticatedUserId(req: Request): string {
  if (!req.user?.id) {
    throw new ApiError('Authentication is required', 401, ErrorCodes.UNAUTHORIZED_OPERATION);
  }

  return req.user.id;
}
