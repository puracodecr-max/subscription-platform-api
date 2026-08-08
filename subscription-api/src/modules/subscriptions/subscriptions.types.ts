export interface Subscription {
  id: string;
  customerId: string;
  customerName: string;
  tenantId: string | null;
  branchId: string | null;
  applicationId: string;
  applicationCode: string;
  applicationName: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string | null;
  nextBillingDate: string;
  billingDay: number;
  status: string;
  autoRenew: boolean;
  administrativeSuspension: boolean;
  administrativeSuspensionReason: string | null;
  customSettings: Record<string, unknown>;
  cancelledAt: string | null;
  cancellationReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlanChange {
  id: string;
  subscriptionId: string;
  oldPlanId: string;
  newPlanId: string;
  requestedBy: string | null;
  approvedBy: string | null;
  requestedAt: string;
  approvedAt: string | null;
  effectiveDate: string;
  status: string;
  reason: string | null;
}
