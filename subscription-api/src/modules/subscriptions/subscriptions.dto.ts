import { z } from 'zod';
import {
  dateSchema,
  idParamsSchema,
  metadataSchema,
  paginationQuerySchema,
  subscriptionStatusSchema,
  uuidSchema
} from '../../shared/validation/commonSchemas';

export const listSubscriptionsQuerySchema = paginationQuerySchema.extend({
  customerId: uuidSchema.optional(),
  applicationId: uuidSchema.optional(),
  status: subscriptionStatusSchema.optional()
});

export const createSubscriptionSchema = z.object({
  customerId: uuidSchema,
  tenantId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
  applicationId: uuidSchema,
  planId: uuidSchema,
  startDate: dateSchema,
  endDate: dateSchema.optional(),
  nextBillingDate: dateSchema,
  billingDay: z.number().int().min(1).max(31),
  status: subscriptionStatusSchema.optional(),
  autoRenew: z.boolean().optional(),
  customSettings: metadataSchema.optional(),
  metadata: metadataSchema.optional()
});

export const updateSubscriptionSchema = z
  .object({
    tenantId: uuidSchema.nullable().optional(),
    branchId: uuidSchema.nullable().optional(),
    endDate: dateSchema.nullable().optional(),
    nextBillingDate: dateSchema.optional(),
    billingDay: z.number().int().min(1).max(31).optional(),
    autoRenew: z.boolean().optional(),
    customSettings: metadataSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

export const suspendSubscriptionSchema = z.object({
  suspensionType: z.enum(['FINANCIAL', 'ADMINISTRATIVE']).default('ADMINISTRATIVE'),
  reason: z.string().trim().min(1).max(500)
});

export const reactivateSubscriptionSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
  forceAdministrative: z.boolean().optional()
});

export const cancelSubscriptionSchema = z.object({
  reason: z.string().trim().min(1).max(500)
});

export const changePlanSchema = z.object({
  newPlanId: uuidSchema,
  effectiveDate: dateSchema,
  reason: z.string().trim().min(1).max(500).optional(),
  approveImmediately: z.boolean().optional()
});

export const subscriptionIdParamsSchema = idParamsSchema;

export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type SuspendSubscriptionInput = z.infer<typeof suspendSubscriptionSchema>;
export type ReactivateSubscriptionInput = z.infer<typeof reactivateSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
