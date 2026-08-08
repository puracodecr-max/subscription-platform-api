import type { RequestHandler } from 'express';
import { ApiError } from '../errors/ApiError';
import { ErrorCodes } from '../errors/errorCodes';

export function requirePermission(permissionCode: string): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;

    if (!user) {
      next(new ApiError('Authentication is required', 401, ErrorCodes.UNAUTHORIZED_OPERATION));
      return;
    }

    if (user.roles.includes('SUPER_ADMIN') || user.permissions.includes(permissionCode)) {
      next();
      return;
    }

    next(new ApiError('You do not have permission to perform this operation', 403, ErrorCodes.FORBIDDEN_OPERATION));
  };
}
