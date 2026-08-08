import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import type { ValidateEntitlementInput } from './entitlements.dto';
import type { EntitlementContext, EntitlementValidationResult } from './entitlements.types';
import * as entitlementsRepository from './entitlements.repository';

const fallbackAllowedModules = ['account', 'invoices', 'payments', 'support', 'profile'];
const fallbackBlockedModules = ['operations'];

export async function validateEntitlement(input: ValidateEntitlementInput, context: EntitlementContext): Promise<EntitlementValidationResult> {
  const application = await entitlementsRepository.findApplicationByCode(input.applicationCode);

  if (context.serviceTokenApplicationCode && context.serviceTokenApplicationCode !== input.applicationCode) {
    throw new ApiError('Service token is not authorized for this application', 403, ErrorCodes.FORBIDDEN_OPERATION);
  }

  const customer = await entitlementsRepository.findCustomerById(input.customerId);
  const applicationModules = extractModuleCodes(application?.modules);

  if (!application) {
    return buildResult(input, null, null, null, false, 'APPLICATION_NOT_FOUND', null, null, null, 0, null, [], []);
  }

  if (!customer) {
    return buildResult(input, application.id, null, null, false, 'CUSTOMER_NOT_FOUND', null, null, null, 0, null, fallbackAllowedModules, blockedModules(applicationModules));
  }

  if (application.status !== 'ACTIVE') {
    const result = buildResult(input, application.id, null, null, false, 'APPLICATION_INACTIVE', null, null, null, 0, null, [], blockedModules(applicationModules));
    await record(input, context, result);
    return result;
  }

  if (customer.status !== 'ACTIVE') {
    const result = buildResult(input, application.id, null, null, false, 'CUSTOMER_INACTIVE', null, null, null, 0, null, fallbackAllowedModules, blockedModules(applicationModules));
    await record(input, context, result);
    return result;
  }

  if (customer.globalSuspension) {
    const result = buildResult(
      input,
      application.id,
      null,
      null,
      false,
      customer.globalSuspensionReason ?? 'GLOBAL_SUSPENSION',
      null,
      null,
      null,
      0,
      null,
      fallbackAllowedModules,
      blockedModules(applicationModules)
    );
    await record(input, context, result);
    return result;
  }

  const subscription = await entitlementsRepository.findSubscriptionForEntitlement(input, application.id);

  if (!subscription) {
    const result = buildResult(input, application.id, null, null, false, 'SUBSCRIPTION_NOT_FOUND', null, null, null, 0, null, fallbackAllowedModules, blockedModules(applicationModules));
    await record(input, context, result);
    return result;
  }

  const financialSummary = await entitlementsRepository.getFinancialSummary(subscription.id);
  const outstandingBalance = Number(financialSummary.outstandingBalance) > 0 ? financialSummary.outstandingBalance : null;

  if (subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED') {
    const result = buildResult(
      input,
      application.id,
      subscription.id,
      subscription.status,
      false,
      `SUBSCRIPTION_${subscription.status}`,
      null,
      null,
      outstandingBalance,
      financialSummary.daysOverdue,
      null,
      fallbackAllowedModules,
      blockedModules(applicationModules)
    );
    await record(input, context, result);
    return result;
  }

  if (subscription.administrativeSuspension || subscription.status === 'SUSPENDED') {
    const reason = subscription.administrativeSuspension ? subscription.administrativeSuspensionReason ?? 'ADMINISTRATIVE_SUSPENSION' : 'SUBSCRIPTION_SUSPENDED';
    const result = buildResult(
      input,
      application.id,
      subscription.id,
      subscription.status,
      false,
      reason,
      null,
      null,
      outstandingBalance,
      financialSummary.daysOverdue,
      null,
      fallbackAllowedModules,
      blockedModules(applicationModules)
    );
    await record(input, context, result);
    return result;
  }

  if (financialSummary.hasBlockingDebt) {
    const result = buildResult(
      input,
      application.id,
      subscription.id,
      subscription.status,
      false,
      'OUTSTANDING_BALANCE',
      null,
      financialSummary.gracePeriodEnd,
      outstandingBalance,
      financialSummary.daysOverdue,
      null,
      fallbackAllowedModules,
      blockedModules(applicationModules)
    );
    await record(input, context, result);
    return result;
  }

  const warningCode = getWarningCode(subscription.status, financialSummary);
  const result = buildResult(
    input,
    application.id,
    subscription.id,
    subscription.status,
    true,
    null,
    getValidUntil(subscription, financialSummary),
    financialSummary.gracePeriodEnd,
    outstandingBalance,
    financialSummary.daysOverdue,
    warningCode,
    applicationModules,
    []
  );
  await record(input, context, result);
  return result;
}

function buildResult(
  input: ValidateEntitlementInput,
  applicationId: string | null,
  subscriptionId: string | null,
  subscriptionStatus: string | null,
  allowed: boolean,
  reason: string | null,
  validUntil: string | null,
  gracePeriodEnd: string | null,
  outstandingBalance: string | null,
  daysOverdue: number,
  warningCode: string | null,
  allowedModules: string[],
  blockedModulesList: string[]
): EntitlementValidationResult {
  return {
    allowed,
    customerId: input.customerId,
    applicationCode: input.applicationCode,
    applicationId,
    subscriptionId,
    subscriptionStatus,
    validUntil,
    reason,
    gracePeriodEnd,
    outstandingBalance,
    daysOverdue,
    warningCode,
    allowedModules,
    blockedModules: blockedModulesList
  };
}

function extractModuleCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      if (typeof item === 'object' && item !== null && 'code' in item && typeof item.code === 'string') {
        return item.code;
      }

      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function blockedModules(applicationModules: string[]): string[] {
  if (applicationModules.length === 0) {
    return fallbackBlockedModules;
  }

  return applicationModules.filter((moduleCode) => !fallbackAllowedModules.includes(moduleCode));
}

function getWarningCode(
  subscriptionStatus: string,
  financialSummary: entitlementsRepository.FinancialEntitlementSummary
): string | null {
  if (financialSummary.hasGraceDebt || subscriptionStatus === 'GRACE_PERIOD') {
    return 'GRACE_PERIOD';
  }

  if (financialSummary.hasOverdueWarningDebt || subscriptionStatus === 'OVERDUE') {
    return 'PAYMENT_OVERDUE';
  }

  return null;
}

function getValidUntil(
  subscription: entitlementsRepository.SubscriptionEntitlementRecord,
  financialSummary: entitlementsRepository.FinancialEntitlementSummary
): string | null {
  if (financialSummary.hasGraceDebt && financialSummary.gracePeriodEnd) {
    return financialSummary.gracePeriodEnd;
  }

  if (financialSummary.hasOverdueWarningDebt && financialSummary.suspensionDate) {
    return financialSummary.suspensionDate;
  }

  return subscription.endDate ?? subscription.nextBillingDate;
}

async function record(input: ValidateEntitlementInput, context: EntitlementContext, result: EntitlementValidationResult): Promise<void> {
  await entitlementsRepository.logAccessValidation({
    applicationId: result.applicationId,
    customerId: input.customerId,
    subscriptionId: result.subscriptionId,
    serviceTokenId: context.serviceTokenId,
    allowed: result.allowed,
    reason: result.reason ?? result.warningCode,
    subscriptionStatus: result.subscriptionStatus,
    ipAddress: context.ipAddress,
    metadata: {
      requestedModule: input.requestedModule ?? null,
      tenantId: input.tenantId ?? null,
      branchId: input.branchId ?? null,
      requestMetadata: input.metadata ?? {},
      response: {
        warningCode: result.warningCode,
        outstandingBalance: result.outstandingBalance,
        daysOverdue: result.daysOverdue
      }
    }
  });
}
