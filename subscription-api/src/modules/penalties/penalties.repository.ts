import type { QueryResultRow } from 'pg';
import { query } from '../../database/pool';
import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import type { ApplyPenaltyInput, WaivePenaltyInput } from './penalties.dto';
import type { Penalty, PenaltyRule } from './penalties.types';

interface PenaltyRow extends QueryResultRow, Penalty {}
interface PenaltyRuleRow extends QueryResultRow, PenaltyRule {}

function penaltySelect() {
  return `
    SELECT
      p.id,
      p.invoice_id AS "invoiceId",
      i.invoice_number AS "invoiceNumber",
      p.subscription_id AS "subscriptionId",
      i.customer_id AS "customerId",
      c.display_name AS "customerName",
      i.application_id AS "applicationId",
      a.code AS "applicationCode",
      p.penalty_rule_id AS "penaltyRuleId",
      pr.code AS "penaltyRuleCode",
      pr.name AS "penaltyRuleName",
      p.base_amount::text AS "baseAmount",
      p.penalty_type::text AS "penaltyType",
      p.penalty_value::text AS "penaltyValue",
      p.amount::text,
      p.status::text AS status,
      p.applied_at::text AS "appliedAt",
      p.waived_at::text AS "waivedAt",
      p.waived_by AS "waivedBy",
      waived.full_name AS "waivedByName",
      p.waived_reason AS "waivedReason",
      p.cancellation_reason AS "cancellationReason",
      p.metadata,
      p.created_at::text AS "createdAt",
      p.updated_at::text AS "updatedAt"
    FROM adm.penalties p
    INNER JOIN adm.invoices i ON i.id = p.invoice_id
    INNER JOIN adm.customers c ON c.id = i.customer_id
    INNER JOIN adm.applications a ON a.id = i.application_id
    INNER JOIN adm.penalty_rules pr ON pr.id = p.penalty_rule_id
    LEFT JOIN adm.users waived ON waived.id = p.waived_by
  `;
}

function penaltyRuleSelect() {
  return `
    SELECT
      pr.id,
      pr.application_id AS "applicationId",
      app.code AS "applicationCode",
      pr.plan_id AS "planId",
      pl.name AS "planName",
      pr.code,
      pr.name,
      pr.description,
      pr.penalty_type::text AS "penaltyType",
      pr.penalty_value::text AS "penaltyValue",
      pr.applies_after_grace AS "appliesAfterGrace",
      pr.status::text AS status,
      pr.metadata,
      pr.created_at::text AS "createdAt",
      pr.updated_at::text AS "updatedAt"
    FROM adm.penalty_rules pr
    LEFT JOIN adm.applications app ON app.id = pr.application_id
    LEFT JOIN adm.plans pl ON pl.id = pr.plan_id
  `;
}

export async function listPenalties(params: {
  limit: number;
  offset: number;
  invoiceId?: string;
  subscriptionId?: string;
  customerId?: string;
  status?: string;
}): Promise<{ items: Penalty[]; total: number }> {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.invoiceId) {
    values.push(params.invoiceId);
    conditions.push(`p.invoice_id = $${values.length}::uuid`);
  }

  if (params.subscriptionId) {
    values.push(params.subscriptionId);
    conditions.push(`p.subscription_id = $${values.length}::uuid`);
  }

  if (params.customerId) {
    values.push(params.customerId);
    conditions.push(`i.customer_id = $${values.length}::uuid`);
  }

  if (params.status) {
    values.push(params.status);
    conditions.push(`p.status = $${values.length}::adm.penalty_status`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query<{ total: string } & QueryResultRow>(
    `
    SELECT COUNT(*) AS total
    FROM adm.penalties p
    INNER JOIN adm.invoices i ON i.id = p.invoice_id
    ${whereClause}
    `,
    values
  );

  values.push(params.limit, params.offset);
  const result = await query<PenaltyRow>(
    `
    ${penaltySelect()}
    ${whereClause}
    ORDER BY p.applied_at DESC, p.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return { items: result.rows, total: Number(countResult.rows[0]?.total ?? 0) };
}

export async function getPenaltyById(id: string): Promise<Penalty | null> {
  const result = await query<PenaltyRow>(
    `
    ${penaltySelect()}
    WHERE p.id = $1::uuid
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function listPenaltyRules(params: {
  limit: number;
  offset: number;
  applicationId?: string;
  planId?: string;
  status?: string;
}): Promise<{ items: PenaltyRule[]; total: number }> {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.applicationId) {
    values.push(params.applicationId);
    conditions.push(`pr.application_id = $${values.length}::uuid`);
  }

  if (params.planId) {
    values.push(params.planId);
    conditions.push(`pr.plan_id = $${values.length}::uuid`);
  }

  if (params.status) {
    values.push(params.status);
    conditions.push(`pr.status = $${values.length}::adm.record_status`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query<{ total: string } & QueryResultRow>(
    `SELECT COUNT(*) AS total FROM adm.penalty_rules pr ${whereClause}`,
    values
  );

  values.push(params.limit, params.offset);
  const result = await query<PenaltyRuleRow>(
    `
    ${penaltyRuleSelect()}
    ${whereClause}
    ORDER BY pr.status ASC, pr.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return { items: result.rows, total: Number(countResult.rows[0]?.total ?? 0) };
}

export async function applyPenalty(input: ApplyPenaltyInput, actorId: string): Promise<Penalty> {
  const result = await query<{ penaltyId: string } & QueryResultRow>(
    `
    SELECT adm.apply_penalty(
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4,
      $5::jsonb
    ) AS "penaltyId"
    `,
    [input.invoiceId, input.penaltyRuleId, actorId, input.reason ?? null, JSON.stringify(input.metadata ?? {})]
  );

  return getRequiredPenalty(result.rows[0].penaltyId);
}

export async function waivePenalty(id: string, input: WaivePenaltyInput, actorId: string): Promise<Penalty> {
  await query('SELECT adm.waive_penalty($1::uuid, $2::uuid, $3, $4::jsonb)', [
    id,
    actorId,
    input.reason,
    JSON.stringify(input.metadata ?? {})
  ]);

  return getRequiredPenalty(id);
}

async function getRequiredPenalty(id: string): Promise<Penalty> {
  const penalty = await getPenaltyById(id);

  if (!penalty) {
    throw new ApiError('Penalty not found', 404, ErrorCodes.PENALTY_NOT_FOUND);
  }

  return penalty;
}
