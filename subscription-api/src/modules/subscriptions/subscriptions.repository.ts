import type { QueryResultRow } from 'pg';
import { query } from '../../database/pool';
import type { ChangePlanInput, CreateSubscriptionInput, UpdateSubscriptionInput } from './subscriptions.dto';
import type { Subscription, SubscriptionPlanChange } from './subscriptions.types';

interface SubscriptionRow extends QueryResultRow {
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

interface PlanChangeRow extends QueryResultRow {
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

function subscriptionSelect() {
  return `
    SELECT
      s.id,
      s.customer_id AS "customerId",
      c.display_name AS "customerName",
      s.tenant_id AS "tenantId",
      s.branch_id AS "branchId",
      s.application_id AS "applicationId",
      a.code AS "applicationCode",
      a.name AS "applicationName",
      s.plan_id AS "planId",
      p.name AS "planName",
      s.start_date::text AS "startDate",
      s.end_date::text AS "endDate",
      s.next_billing_date::text AS "nextBillingDate",
      s.billing_day AS "billingDay",
      s.status::text AS status,
      s.auto_renew AS "autoRenew",
      s.administrative_suspension AS "administrativeSuspension",
      s.administrative_suspension_reason AS "administrativeSuspensionReason",
      s.custom_settings AS "customSettings",
      s.cancelled_at::text AS "cancelledAt",
      s.cancellation_reason AS "cancellationReason",
      s.metadata,
      s.created_at::text AS "createdAt",
      s.updated_at::text AS "updatedAt"
    FROM adm.subscriptions s
    INNER JOIN adm.customers c ON c.id = s.customer_id
    INNER JOIN adm.applications a ON a.id = s.application_id
    INNER JOIN adm.plans p ON p.id = s.plan_id
  `;
}

export async function listSubscriptions(params: {
  limit: number;
  offset: number;
  customerId?: string;
  applicationId?: string;
  status?: string;
}): Promise<{ items: Subscription[]; total: number }> {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.customerId) {
    values.push(params.customerId);
    conditions.push(`s.customer_id = $${values.length}::uuid`);
  }

  if (params.applicationId) {
    values.push(params.applicationId);
    conditions.push(`s.application_id = $${values.length}::uuid`);
  }

  if (params.status) {
    values.push(params.status);
    conditions.push(`s.status = $${values.length}::adm.subscription_status`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query<{ total: string } & QueryResultRow>(
    `SELECT COUNT(*) AS total FROM adm.subscriptions s ${whereClause}`,
    values
  );

  values.push(params.limit, params.offset);
  const result = await query<SubscriptionRow>(
    `
    ${subscriptionSelect()}
    ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return { items: result.rows, total: Number(countResult.rows[0]?.total ?? 0) };
}

export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  const result = await query<SubscriptionRow>(
    `
    ${subscriptionSelect()}
    WHERE s.id = $1::uuid
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function createSubscription(input: CreateSubscriptionInput, actorId: string): Promise<Subscription> {
  const result = await query<{ id: string } & QueryResultRow>(
    `
    INSERT INTO adm.subscriptions (
      customer_id,
      tenant_id,
      branch_id,
      application_id,
      plan_id,
      start_date,
      end_date,
      next_billing_date,
      billing_day,
      status,
      auto_renew,
      custom_settings,
      metadata,
      created_by,
      updated_by
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4::uuid,
      $5::uuid,
      $6::date,
      $7::date,
      $8::date,
      $9,
      COALESCE($10::adm.subscription_status, 'TRIAL'),
      COALESCE($11, true),
      $12::jsonb,
      $13::jsonb,
      $14::uuid,
      $14::uuid
    )
    RETURNING id
    `,
    [
      input.customerId,
      input.tenantId ?? null,
      input.branchId ?? null,
      input.applicationId,
      input.planId,
      input.startDate,
      input.endDate ?? null,
      input.nextBillingDate,
      input.billingDay,
      input.status ?? null,
      input.autoRenew ?? null,
      JSON.stringify(input.customSettings ?? {}),
      JSON.stringify(input.metadata ?? {}),
      actorId
    ]
  );

  return getSubscriptionById(result.rows[0].id) as Promise<Subscription>;
}

export async function updateSubscription(id: string, input: UpdateSubscriptionInput, actorId: string): Promise<Subscription | null> {
  const assignments: string[] = [];
  const values: unknown[] = [];

  function addAssignment(column: string, value: unknown, cast = '') {
    values.push(value);
    assignments.push(`${column} = $${values.length}${cast}`);
  }

  if (input.tenantId !== undefined) addAssignment('tenant_id', input.tenantId, '::uuid');
  if (input.branchId !== undefined) addAssignment('branch_id', input.branchId, '::uuid');
  if (input.endDate !== undefined) addAssignment('end_date', input.endDate, '::date');
  if (input.nextBillingDate !== undefined) addAssignment('next_billing_date', input.nextBillingDate, '::date');
  if (input.billingDay !== undefined) addAssignment('billing_day', input.billingDay);
  if (input.autoRenew !== undefined) addAssignment('auto_renew', input.autoRenew);
  if (input.customSettings !== undefined) addAssignment('custom_settings', JSON.stringify(input.customSettings), '::jsonb');
  if (input.metadata !== undefined) addAssignment('metadata', JSON.stringify(input.metadata), '::jsonb');

  addAssignment('updated_by', actorId, '::uuid');
  values.push(id);

  const result = await query<{ id: string } & QueryResultRow>(
    `
    UPDATE adm.subscriptions
    SET ${assignments.join(', ')}
    WHERE id = $${values.length}::uuid
    RETURNING id
    `,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  return getSubscriptionById(result.rows[0].id);
}

export async function suspendSubscription(id: string, suspensionType: string, reason: string, actorId: string): Promise<Subscription | null> {
  await query('SELECT adm.suspend_subscription($1::uuid, $2::adm.suspension_type, $3, $4::uuid)', [
    id,
    suspensionType,
    reason,
    actorId
  ]);
  return getSubscriptionById(id);
}

export async function reactivateSubscription(id: string, actorId: string, reason: string | null, forceAdministrative: boolean): Promise<Subscription | null> {
  await query('SELECT adm.reactivate_subscription($1::uuid, $2::uuid, $3, $4)', [id, actorId, reason, forceAdministrative]);
  return getSubscriptionById(id);
}

export async function cancelSubscription(id: string, actorId: string, reason: string): Promise<Subscription | null> {
  await query('SELECT adm.transition_subscription_status($1::uuid, $2::adm.subscription_status, $3, $4::uuid, $5)', [
    id,
    'CANCELLED',
    reason,
    actorId,
    'API'
  ]);
  return getSubscriptionById(id);
}

export async function createPlanChange(
  subscription: Subscription,
  input: ChangePlanInput,
  actorId: string
): Promise<SubscriptionPlanChange> {
  const status = input.approveImmediately ? 'APPROVED' : 'REQUESTED';
  const result = await query<PlanChangeRow>(
    `
    INSERT INTO adm.subscription_plan_changes (
      subscription_id,
      old_plan_id,
      new_plan_id,
      requested_by,
      approved_by,
      approved_at,
      effective_date,
      status,
      reason,
      created_by,
      updated_by
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4::uuid,
      $5::uuid,
      $6::timestamptz,
      $7::date,
      $8::adm.plan_change_status,
      $9,
      $4::uuid,
      $4::uuid
    )
    RETURNING
      id,
      subscription_id AS "subscriptionId",
      old_plan_id AS "oldPlanId",
      new_plan_id AS "newPlanId",
      requested_by AS "requestedBy",
      approved_by AS "approvedBy",
      requested_at::text AS "requestedAt",
      approved_at::text AS "approvedAt",
      effective_date::text AS "effectiveDate",
      status::text AS status,
      reason
    `,
    [
      subscription.id,
      subscription.planId,
      input.newPlanId,
      actorId,
      input.approveImmediately ? actorId : null,
      input.approveImmediately ? new Date().toISOString() : null,
      input.effectiveDate,
      status,
      input.reason ?? null
    ]
  );

  return result.rows[0];
}
