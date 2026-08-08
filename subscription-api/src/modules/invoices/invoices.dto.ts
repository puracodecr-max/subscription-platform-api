import { z } from 'zod';
import {
  dateSchema,
  idParamsSchema,
  invoiceStatusSchema,
  metadataSchema,
  moneySchema,
  paginationQuerySchema,
  uuidSchema
} from '../../shared/validation/commonSchemas';

export const listInvoicesQuerySchema = paginationQuerySchema.extend({
  customerId: uuidSchema.optional(),
  subscriptionId: uuidSchema.optional(),
  status: invoiceStatusSchema.optional(),
  dueFrom: dateSchema.optional(),
  dueTo: dateSchema.optional()
});

export const generateInvoiceSchema = z.object({
  subscriptionId: uuidSchema,
  billingPeriodStart: dateSchema,
  billingPeriodEnd: dateSchema,
  issueDate: dateSchema,
  dueDate: dateSchema,
  idempotencyKey: z.string().trim().min(8).max(160).optional()
});

export const adjustmentSchema = z.object({
  type: z.enum(['CHARGE', 'CREDIT']),
  description: z.string().trim().min(1).max(500),
  amount: moneySchema,
  metadata: metadataSchema.optional()
});

export const cancelInvoiceSchema = z.object({
  reason: z.string().trim().min(1).max(500)
});

export const invoiceIdParamsSchema = idParamsSchema;

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;
