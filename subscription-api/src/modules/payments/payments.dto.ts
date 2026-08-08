import { z } from 'zod';
import { dateSchema, idParamsSchema, metadataSchema, moneySchema, paginationQuerySchema, paymentStatusSchema, uuidSchema } from '../../shared/validation/commonSchemas';

export const listPaymentsQuerySchema = paginationQuerySchema.extend({
  customerId: uuidSchema.optional(),
  status: paymentStatusSchema.optional(),
  receivedFrom: dateSchema.optional(),
  receivedTo: dateSchema.optional()
});

export const createPaymentSchema = z.object({
  customerId: uuidSchema,
  paymentMethodId: uuidSchema.optional(),
  currencyId: uuidSchema,
  externalReference: z.string().trim().min(1).max(160).optional(),
  idempotencyKey: z.string().trim().min(8).max(160).optional(),
  amount: moneySchema,
  paidAt: z.string().datetime().optional(),
  notes: z.string().trim().min(1).max(1000).optional(),
  metadata: metadataSchema.optional()
});

export const paymentActionSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional()
});

export const rejectPaymentSchema = z.object({
  reason: z.string().trim().min(1).max(500)
});

export const paymentIdParamsSchema = idParamsSchema;

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentActionInput = z.infer<typeof paymentActionSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
