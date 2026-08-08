import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operacion realizada correctamente',
  statusCode = 200,
  pagination?: PaginationMeta
) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    ...(pagination ? { pagination } : {})
  });
}
