import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../errors/ApiError';
import { mapDatabaseError } from '../errors/databaseError';
import { ErrorCodes } from '../errors/errorCodes';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid request data',
        details: error.flatten()
      }
    });
    return;
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const mappedError = mapDatabaseError(error);
    res.status(mappedError.statusCode).json({
      success: false,
      error: {
        code: mappedError.code,
        message: mappedError.message,
        details: mappedError.details
      }
    });
    return;
  }

  console.error('Unhandled error', error);
  res.status(500).json({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Internal server error',
      details: null
    }
  });
};
