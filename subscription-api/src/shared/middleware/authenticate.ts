import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../../config/env';
import { ApiError } from '../errors/ApiError';
import { ErrorCodes } from '../errors/errorCodes';

function isJwtPayload(value: string | JwtPayload): value is JwtPayload {
  return typeof value === 'object' && value !== null;
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(new ApiError('Authentication token is required', 401, ErrorCodes.UNAUTHORIZED_OPERATION));
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (!isJwtPayload(payload) || typeof payload.sub !== 'string') {
      next(new ApiError('Invalid authentication token', 401, ErrorCodes.UNAUTHORIZED_OPERATION));
      return;
    }

    const roles = Array.isArray(payload.roles) ? payload.roles.filter((item): item is string => typeof item === 'string') : [];
    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions.filter((item): item is string => typeof item === 'string')
      : [];

    req.user = {
      id: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : '',
      roles,
      permissions
    };

    next();
  } catch {
    next(new ApiError('Invalid or expired authentication token', 401, ErrorCodes.UNAUTHORIZED_OPERATION));
  }
};
