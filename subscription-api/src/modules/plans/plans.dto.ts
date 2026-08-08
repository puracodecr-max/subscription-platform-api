import { z } from 'zod';
import {
  billingFrequencySchema,
  idParamsSchema,
  metadataSchema,
  moneySchema,
  paginationQuerySchema,
  penaltyTypeSchema,
  recordStatusSchema,
  uuidSchema
} from '../../shared/validation/commonSchemas';

export const listPlansQuerySchema = paginationQuerySchema.extend({
  applicationId: uuidSchema.optional(),
  status: recordStatusSchema.optional(),
  search: z.string().trim().min(1).max(120).optional()
});

export const createPlanSchema = z.object({
  applicationId: uuidSchema,
  code: z.string().trim().regex(/^[A-Z0-9_]+$/).max(80),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(500).optional(),
  price: moneySchema,
  currencyId: uuidSchema,
  frequency: billingFrequencySchema.optional(),
  gracePeriodDays: z.number().int().min(0).max(365).optional(),
  suspensionAfterDueDays: z.number().int().min(0).max(365).optional(),
  penaltyType: penaltyTypeSchema.optional(),
  penaltyValue: moneySchema.optional(),
  status: recordStatusSchema.optional(),
  metadata: metadataSchema.optional()
});

export const updatePlanSchema = createPlanSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required'
});

export const planIdParamsSchema = idParamsSchema;

export type ListPlansQuery = z.infer<typeof listPlansQuerySchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
