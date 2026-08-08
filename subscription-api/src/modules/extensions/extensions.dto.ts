import { z } from 'zod';
import { dateSchema, extensionStatusSchema, idParamsSchema, metadataSchema, paginationQuerySchema, uuidSchema } from '../../shared/validation/commonSchemas';

export const listExtensionsQuerySchema = paginationQuerySchema.extend({
  subscriptionId: uuidSchema.optional(),
  invoiceId: uuidSchema.optional(),
  customerId: uuidSchema.optional(),
  status: extensionStatusSchema.optional()
});

export const createExtensionSchema = z.object({
  subscriptionId: uuidSchema,
  invoiceId: uuidSchema.optional(),
  originalDueDate: dateSchema.optional(),
  extendedDueDate: dateSchema,
  reason: z.string().trim().min(1).max(500),
  reactivateIfEligible: z.boolean().optional(),
  metadata: metadataSchema.optional()
});

export const cancelExtensionSchema = z.object({
  reason: z.string().trim().min(1).max(500)
});

export const extensionIdParamsSchema = idParamsSchema;

export type ListExtensionsQuery = z.infer<typeof listExtensionsQuerySchema>;
export type CreateExtensionInput = z.infer<typeof createExtensionSchema>;
export type CancelExtensionInput = z.infer<typeof cancelExtensionSchema>;
