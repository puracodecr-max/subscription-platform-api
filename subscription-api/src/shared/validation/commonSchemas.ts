import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const recordStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']);

export const billingFrequencySchema = z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']);

export const penaltyTypeSchema = z.enum(['FIXED', 'PERCENTAGE', 'TIERED']);

export const subscriptionStatusSchema = z.enum([
  'TRIAL',
  'ACTIVE',
  'GRACE_PERIOD',
  'OVERDUE',
  'SUSPENDED',
  'CANCELLED',
  'EXPIRED'
]);

export const invoiceStatusSchema = z.enum(['ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']);

export const paymentStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'REVERSED']);

export const penaltyStatusSchema = z.enum(['APPLIED', 'WAIVED', 'CANCELLED']);

export const extensionStatusSchema = z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']);

export const invoiceItemTypeSchema = z.enum(['PLAN_FEE', 'DISCOUNT', 'TAX', 'PENALTY', 'ADJUSTMENT', 'CREDIT', 'OTHER']);

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date format YYYY-MM-DD');

export const metadataSchema = z.record(z.unknown()).default({});

export const moneySchema = z.union([z.number().nonnegative(), z.string().regex(/^\d+(\.\d{1,2})?$/)]).transform(String);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

export const idParamsSchema = z.object({
  id: uuidSchema
});
