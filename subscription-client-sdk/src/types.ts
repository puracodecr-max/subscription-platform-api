export interface EntitlementResult {
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

export interface ValidateEntitlementInput {
  customerId: string;
  applicationCode: string;
  tenantId?: string;
  branchId?: string;
  requestedModule?: string;
  metadata?: Record<string, unknown>;
}

export interface ServiceTokenInfo {
  id: string;
  applicationId: string | null;
  applicationCode: string | null;
  scopes: string[];
}

export interface SdkConfig {
  /** Origin of subscription-api, for example https://subscriptions.example.com. */
  baseUrl: string;
  serviceToken: string;
  /** API prefix exposed by subscription-api. Defaults to /api/v1. */
  apiPath?: string;
  defaultTenantId?: string;
  defaultBranchId?: string;
  timeoutMs?: number;
  /** In-memory entitlement cache TTL. Set to 0 to disable caching. */
  cacheTtlMs?: number;
  /** Cache TTL for denied entitlements. Defaults to 30 seconds; set to 0 to disable. */
  deniedCacheTtlMs?: number;
}
