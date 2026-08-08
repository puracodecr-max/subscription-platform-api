export interface EntitlementValidationResult {
  allowed: boolean;
  customerId: string;
  applicationCode: string;
  applicationId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  validUntil: string | null;
  reason: string | null;
  gracePeriodEnd: string | null;
  outstandingBalance: string | null;
  daysOverdue: number;
  warningCode: string | null;
  allowedModules: string[];
  blockedModules: string[];
}

export interface EntitlementContext {
  serviceTokenId: string;
  serviceTokenApplicationId: string | null;
  serviceTokenApplicationCode: string | null;
  ipAddress: string | null;
}
