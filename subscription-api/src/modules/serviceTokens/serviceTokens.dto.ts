import { z } from 'zod';
import { idParamsSchema, paginationQuerySchema, uuidSchema } from '../../shared/validation/commonSchemas';

export const serviceTokenStatusSchema = z.enum(['ACTIVE', 'REVOKED', 'EXPIRED']);

export const listServiceTokensQuerySchema = paginationQuerySchema.extend({
  applicationId: uuidSchema.optional(),
  status: serviceTokenStatusSchema.optional()
});

export const createServiceTokenSchema = z.object({
  applicationId: uuidSchema.optional(),
  name: z.string().trim().min(1).max(200),
  scopes: z.array(z.string().trim().min(1).max(120)).min(1).default(['entitlements.validate']),
  expiresAt: z.string().datetime().optional()
});

export const revokeServiceTokenSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional()
});

export const serviceTokenIdParamsSchema = idParamsSchema;

export type ListServiceTokensQuery = z.infer<typeof listServiceTokensQuerySchema>;
export type CreateServiceTokenInput = z.infer<typeof createServiceTokenSchema>;
export type RevokeServiceTokenInput = z.infer<typeof revokeServiceTokenSchema>;
