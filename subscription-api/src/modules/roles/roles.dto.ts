import { z } from 'zod';
import { idParamsSchema, paginationQuerySchema, recordStatusSchema } from '../../shared/validation/commonSchemas';

export const listRolesQuerySchema = paginationQuerySchema.extend({
  status: recordStatusSchema.optional()
});

export const roleIdParamsSchema = idParamsSchema;

export type ListRolesQuery = z.infer<typeof listRolesQuerySchema>;
