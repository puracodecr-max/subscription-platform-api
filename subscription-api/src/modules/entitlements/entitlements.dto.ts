import { z } from 'zod';
import { metadataSchema, uuidSchema } from '../../shared/validation/commonSchemas';

export const validateEntitlementSchema = z.object({
  customerId: uuidSchema,
  applicationCode: z.string().trim().min(1).max(80).regex(/^[A-Z0-9_]+$/),
  tenantId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
  requestedModule: z.string().trim().min(1).max(80).optional(),
  metadata: metadataSchema.optional()
});

export type ValidateEntitlementInput = z.infer<typeof validateEntitlementSchema>;
