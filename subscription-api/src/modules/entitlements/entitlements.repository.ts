import type { QueryResultRow } from 'pg';
import { query } from '../../database/pool';
import type { ValidateEntitlementInput } from './entitlements.dto';

interface ApplicationRow extends QueryResultRow {
  id: string;
  code: string;
  status: string;
  modules: unknown;
}

interface CustomerRow extends QueryResultRow {
  id: string;
  status: string;
  globalSuspension: boolean;
  globalSuspensionReason: string | null;
}

export interface SubscriptionEntitlementRecord {
  id: string;
  status: string;
  endDate: string | null;
  nextBillingDate: string;
  administrativeSuspension: boolean;
  administrativeSuspensionReason: string | null;
  gracePeriodDays: number;
  suspensionAfterDueDays: number;
}

interface SubscriptionRow extends QueryResultRow, SubscriptionEntitlementRecord {}

export interface FinancialEntitlementSummary {
  outstandingBalance: string;
  overdueBalance: string;
  daysOverdue: number;
  gracePeriodEnd: string | null;
  suspensionDate: string | null;
  hasGraceDebt: boolean;
  hasOverdueWarningDebt: boolean;
  hasBlockingDebt: boolean;
}

interface FinancialSummaryRow extends QueryResultRow, FinancialEntitlementSummary {}

export async function findApplicationByCode(applicationCode: string): Promise<ApplicationRow | null> {
  const result = await query<ApplicationRow>(
    `
    SELECT id, code, status::text AS status, modules
    FROM adm.applications
    WHERE code = $1
    LIMIT 1
    `,
    [applicationCode]
  );

  return result.rows[0] ?? null;
}

export async function findCustomerById(customerId: string): Promise<CustomerRow | null> {
  const result = await query<CustomerRow>(
    `
    SELECT
      id,
      status::text AS status,
      global_suspension AS "globalSuspension",
      global_suspension_reason AS "globalSuspensionReason"
    FROM adm.customers
    WHERE id = $1::uuid
    LIMIT 1
    `,
    [customerId]
  );

  return result.rows[0] ?? null;
}

export async function findSubscriptionForEntitlement(input: ValidateEntitlementInput, applicationId: string): Promise<SubscriptionEntitlementRecord | null> {
  const result = await query<SubscriptionRow>(
    `
    SELECT
      s.id,
      s.status::text AS status,
      s.end_date::text AS "endDate",
      s.next_billing_date::text AS "nextBillingDate",
      s.administrative_suspension AS "administrativeSuspension",
      s.administrative_suspension_reason AS "administrativeSuspensionReason",
      p.grace_period_days AS "gracePeriodDays",
      p.suspension_after_due_days AS "suspensionAfterDueDays"
    FROM adm.subscriptions s
    INNER JOIN adm.plans p ON p.id = s.plan_id
    WHERE s.customer_id = $1::uuid
      AND s.application_id = $2::uuid
      AND (
        ($3::uuid IS NULL AND s.tenant_id IS NULL)
        OR s.tenant_id = $3::uuid
      )
      AND (
        ($4::uuid IS NULL AND s.branch_id IS NULL)
        OR s.branch_id = $4::uuid
      )
    ORDER BY
      CASE s.status
        WHEN 'ACTIVE' THEN 1
        WHEN 'TRIAL' THEN 2
        WHEN 'GRACE_PERIOD' THEN 3
        WHEN 'OVERDUE' THEN 4
        WHEN 'SUSPENDED' THEN 5
        ELSE 9
      END,
      s.created_at DESC
    LIMIT 1
    `,
    [input.customerId, applicationId, input.tenantId ?? null, input.branchId ?? null]
  );

  return result.rows[0] ?? null;
}

export async function getFinancialSummary(subscriptionId: string): Promise<FinancialEntitlementSummary> {
  const result = await query<FinancialSummaryRow>(
    `
    WITH unpaid AS (
      SELECT
        i.id,
        i.balance_amount,
        i.due_date,
        p.grace_period_days,
        p.suspension_after_due_days,
        EXISTS (
          SELECT 1
          FROM adm.subscription_extensions e
          WHERE e.invoice_id = i.id
            AND e.status = 'ACTIVE'
            AND e.extended_due_date >= CURRENT_DATE
        ) AS has_active_extension
      FROM adm.invoices i
      INNER JOIN adm.subscriptions s ON s.id = i.subscription_id
      INNER JOIN adm.plans p ON p.id = s.plan_id
      WHERE i.subscription_id = $1::uuid
        AND i.status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
        AND i.balance_amount > 0
    ), overdue AS (
      SELECT *
      FROM unpaid
      WHERE due_date < CURRENT_DATE
        AND has_active_extension = false
    )
    SELECT
      COALESCE((SELECT sum(balance_amount) FROM unpaid), 0)::text AS "outstandingBalance",
      COALESCE((SELECT sum(balance_amount) FROM overdue), 0)::text AS "overdueBalance",
      COALESCE((SELECT max(CURRENT_DATE - due_date) FROM overdue), 0)::int AS "daysOverdue",
      (SELECT min((due_date + grace_period_days)::date)::text FROM overdue)::text AS "gracePeriodEnd",
      (SELECT min((due_date + suspension_after_due_days)::date)::text FROM overdue)::text AS "suspensionDate",
      COALESCE((
        SELECT bool_or(CURRENT_DATE <= (due_date + grace_period_days)::date)
        FROM overdue
      ), false) AS "hasGraceDebt",
      COALESCE((
        SELECT bool_or(
          CURRENT_DATE > (due_date + grace_period_days)::date
          AND CURRENT_DATE <= (due_date + suspension_after_due_days)::date
        )
        FROM overdue
      ), false) AS "hasOverdueWarningDebt",
      COALESCE((
        SELECT bool_or(CURRENT_DATE > (due_date + suspension_after_due_days)::date)
        FROM overdue
      ), false) AS "hasBlockingDebt"
    `,
    [subscriptionId]
  );

  return result.rows[0];
}

export async function logAccessValidation(params: {
  applicationId: string | null;
  customerId: string;
  subscriptionId: string | null;
  serviceTokenId: string;
  allowed: boolean;
  reason: string | null;
  subscriptionStatus: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
}): Promise<void> {
  if (!params.applicationId) {
    return;
  }

  await query(
    `
    INSERT INTO adm.application_access_logs (
      application_id,
      customer_id,
      subscription_id,
      service_token_id,
      allowed,
      reason,
      subscription_status,
      ip_address,
      metadata
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4::uuid,
      $5,
      $6,
      $7::adm.subscription_status,
      $8::inet,
      $9::jsonb
    )
    `,
    [
      params.applicationId,
      params.customerId,
      params.subscriptionId,
      params.serviceTokenId,
      params.allowed,
      params.reason,
      params.subscriptionStatus,
      params.ipAddress,
      JSON.stringify(params.metadata)
    ]
  );
}
