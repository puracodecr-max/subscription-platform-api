import { z } from 'zod';
import { idParamsSchema, metadataSchema, paginationQuerySchema, recordStatusSchema } from '../../shared/validation/commonSchemas';

export const listApplicationsQuerySchema = paginationQuerySchema.extend({
  status: recordStatusSchema.optional(),
  search: z.string().trim().min(1).max(120).optional()
});

export const createApplicationSchema = z.object({
  code: z.string().trim().regex(/^[A-Z0-9_]+$/).max(80),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(500).optional(),
  modules: z.array(z.record(z.unknown())).optional(),
  status: recordStatusSchema.optional(),
  metadata: metadataSchema.optional()
});

export const updateApplicationSchema = createApplicationSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required'
});

export const applicationIdParamsSchema = idParamsSchema;

export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
