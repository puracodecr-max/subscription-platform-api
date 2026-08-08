import type { QueryResultRow } from 'pg';
import { query } from '../../database/pool';
import type { CreatePlanInput, UpdatePlanInput } from './plans.dto';
import type { Plan } from './plans.types';

interface PlanRow extends QueryResultRow {
  id: string;
  applicationId: string;
  code: string;
  name: string;
  description: string | null;
  price: string;
  currencyId: string;
  currencyCode: string;
  frequency: string;
  gracePeriodDays: number;
  suspensionAfterDueDays: number;
  penaltyType: string;
  penaltyValue: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function planSelect() {
  return `
    SELECT
      p.id,
      p.application_id AS "applicationId",
      p.code,
      p.name,
      p.description,
      p.price::text AS price,
      p.currency_id AS "currencyId",
      c.code AS "currencyCode",
      p.frequency::text AS frequency,
      p.grace_period_days AS "gracePeriodDays",
      p.suspension_after_due_days AS "suspensionAfterDueDays",
      p.penalty_type::text AS "penaltyType",
      p.penalty_value::text AS "penaltyValue",
      p.status::text AS status,
      p.metadata,
      p.created_at::text AS "createdAt",
      p.updated_at::text AS "updatedAt"
    FROM adm.plans p
    INNER JOIN adm.currencies c ON c.id = p.currency_id
  `;
}

export async function listPlans(params: {
  limit: number;
  offset: number;
  applicationId?: string;
  status?: string;
  search?: string;
}): Promise<{ items: Plan[]; total: number }> {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.applicationId) {
    values.push(params.applicationId);
    conditions.push(`p.application_id = $${values.length}::uuid`);
  }

  if (params.status) {
    values.push(params.status);
    conditions.push(`p.status = $${values.length}::adm.record_status`);
  }

  if (params.search) {
    values.push(`%${params.search}%`);
    conditions.push(`(p.code ILIKE $${values.length} OR p.name ILIKE $${values.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query<{ total: string } & QueryResultRow>(
    `SELECT COUNT(*) AS total FROM adm.plans p ${whereClause}`,
    values
  );

  values.push(params.limit, params.offset);
  const result = await query<PlanRow>(
    `
    ${planSelect()}
    ${whereClause}
    ORDER BY p.name ASC
    LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return { items: result.rows, total: Number(countResult.rows[0]?.total ?? 0) };
}

export async function getPlanById(id: string): Promise<Plan | null> {
  const result = await query<PlanRow>(
    `
    ${planSelect()}
    WHERE p.id = $1::uuid
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function createPlan(input: CreatePlanInput, actorId: string): Promise<Plan> {
  const result = await query<PlanRow>(
    `
    INSERT INTO adm.plans (
      application_id,
      code,
      name,
      description,
      price,
      currency_id,
      frequency,
      grace_period_days,
      suspension_after_due_days,
      penalty_type,
      penalty_value,
      status,
      metadata,
      created_by,
      updated_by
    )
    VALUES (
      $1::uuid,
      $2,
      $3,
      $4,
      $5::numeric,
      $6::uuid,
      COALESCE($7::adm.billing_frequency, 'MONTHLY'),
      COALESCE($8, 5),
      COALESCE($9, 10),
      COALESCE($10::adm.penalty_type, 'PERCENTAGE'),
      COALESCE($11::numeric, 5),
      COALESCE($12::adm.record_status, 'ACTIVE'),
      $13::jsonb,
      $14::uuid,
      $14::uuid
    )
    RETURNING id
    `,
    [
      input.applicationId,
      input.code,
      input.name,
      input.description ?? null,
      input.price,
      input.currencyId,
      input.frequency ?? null,
      input.gracePeriodDays ?? null,
      input.suspensionAfterDueDays ?? null,
      input.penaltyType ?? null,
      input.penaltyValue ?? null,
      input.status ?? null,
      JSON.stringify(input.metadata ?? {}),
      actorId
    ]
  );

  return getPlanById(result.rows[0].id) as Promise<Plan>;
}

export async function updatePlan(id: string, input: UpdatePlanInput, actorId: string): Promise<Plan | null> {
  const assignments: string[] = [];
  const values: unknown[] = [];

  function addAssignment(column: string, value: unknown, cast = '') {
    values.push(value);
    assignments.push(`${column} = $${values.length}${cast}`);
  }

  if (input.applicationId !== undefined) addAssignment('application_id', input.applicationId, '::uuid');
  if (input.code !== undefined) addAssignment('code', input.code);
  if (input.name !== undefined) addAssignment('name', input.name);
  if (input.description !== undefined) addAssignment('description', input.description);
  if (input.price !== undefined) addAssignment('price', input.price, '::numeric');
  if (input.currencyId !== undefined) addAssignment('currency_id', input.currencyId, '::uuid');
  if (input.frequency !== undefined) addAssignment('frequency', input.frequency, '::adm.billing_frequency');
  if (input.gracePeriodDays !== undefined) addAssignment('grace_period_days', input.gracePeriodDays);
  if (input.suspensionAfterDueDays !== undefined) addAssignment('suspension_after_due_days', input.suspensionAfterDueDays);
  if (input.penaltyType !== undefined) addAssignment('penalty_type', input.penaltyType, '::adm.penalty_type');
  if (input.penaltyValue !== undefined) addAssignment('penalty_value', input.penaltyValue, '::numeric');
  if (input.status !== undefined) addAssignment('status', input.status, '::adm.record_status');
  if (input.metadata !== undefined) addAssignment('metadata', JSON.stringify(input.metadata), '::jsonb');

  addAssignment('updated_by', actorId, '::uuid');
  values.push(id);

  const result = await query<{ id: string } & QueryResultRow>(
    `
    UPDATE adm.plans
    SET ${assignments.join(', ')}
    WHERE id = $${values.length}::uuid
    RETURNING id
    `,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  return getPlanById(result.rows[0].id);
}

export async function planMatchesApplication(planId: string, applicationId: string): Promise<boolean> {
  const result = await query<{ exists: boolean } & QueryResultRow>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM adm.plans
      WHERE id = $1::uuid
        AND application_id = $2::uuid
    ) AS exists
    `,
    [planId, applicationId]
  );

  return result.rows[0]?.exists ?? false;
}
