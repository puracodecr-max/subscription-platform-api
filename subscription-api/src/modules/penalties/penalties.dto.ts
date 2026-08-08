import { z } from 'zod';
import { idParamsSchema, metadataSchema, paginationQuerySchema, penaltyStatusSchema, recordStatusSchema, uuidSchema } from '../../shared/validation/commonSchemas';

export const listPenaltiesQuerySchema = paginationQuerySchema.extend({
  invoiceId: uuidSchema.optional(),
  subscriptionId: uuidSchema.optional(),
  customerId: uuidSchema.optional(),
  status: penaltyStatusSchema.optional()
});

export const listPenaltyRulesQuerySchema = paginationQuerySchema.extend({
  applicationId: uuidSchema.optional(),
  planId: uuidSchema.optional(),
  status: recordStatusSchema.optional()
});

export const applyPenaltySchema = z.object({
  invoiceId: uuidSchema,
  penaltyRuleId: uuidSchema,
  reason: z.string().trim().min(1).max(500).optional(),
  metadata: metadataSchema.optional()
});

export const waivePenaltySchema = z.object({
  reason: z.string().trim().min(1).max(500),
  metadata: metadataSchema.optional()
});

export const penaltyIdParamsSchema = idParamsSchema;

export type ListPenaltiesQuery = z.infer<typeof listPenaltiesQuerySchema>;
export type ListPenaltyRulesQuery = z.infer<typeof listPenaltyRulesQuerySchema>;
export type ApplyPenaltyInput = z.infer<typeof applyPenaltySchema>;
export type WaivePenaltyInput = z.infer<typeof waivePenaltySchema>;
