import type { RequestHandler } from 'express';
import { ErrorCodes } from '../errors/errorCodes';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: ErrorCodes.ROUTE_NOT_FOUND,
      message: `Route ${req.method} ${req.path} was not found`,
      details: null
    }
  });
};
