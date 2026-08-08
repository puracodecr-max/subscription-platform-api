import { z } from 'zod';
import { idParamsSchema, metadataSchema, paginationQuerySchema, recordStatusSchema } from '../../shared/validation/commonSchemas';

export const listCustomersQuerySchema = paginationQuerySchema.extend({
  status: recordStatusSchema.optional(),
  search: z.string().trim().min(1).max(120).optional()
});

export const createCustomerSchema = z.object({
  externalCode: z.string().trim().min(1).max(80).optional(),
  legalName: z.string().trim().min(1).max(200),
  displayName: z.string().trim().min(1).max(200),
  taxId: z.string().trim().min(1).max(80).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().min(1).max(50).optional(),
  status: recordStatusSchema.optional(),
  globalSuspension: z.boolean().optional(),
  globalSuspensionReason: z.string().trim().min(1).max(500).optional(),
  metadata: metadataSchema.optional()
});

export const updateCustomerSchema = createCustomerSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required'
});

export const customerIdParamsSchema = idParamsSchema;

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
