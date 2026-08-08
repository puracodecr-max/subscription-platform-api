import type { QueryResultRow } from 'pg';
import { query } from '../../database/pool';
import type { CreateCustomerInput, UpdateCustomerInput } from './customers.dto';
import type { Customer } from './customers.types';

interface CustomerRow extends QueryResultRow {
  id: string;
  externalCode: string | null;
  legalName: string;
  displayName: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  globalSuspension: boolean;
  globalSuspensionReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function customerSelect() {
  return `
    SELECT
      id,
      external_code AS "externalCode",
      legal_name AS "legalName",
      display_name AS "displayName",
      tax_id AS "taxId",
      email::text AS email,
      phone,
      status::text AS status,
      global_suspension AS "globalSuspension",
      global_suspension_reason AS "globalSuspensionReason",
      metadata,
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    FROM adm.customers
  `;
}

export async function listCustomers(params: {
  limit: number;
  offset: number;
  status?: string;
  search?: string;
}): Promise<{ items: Customer[]; total: number }> {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.status) {
    values.push(params.status);
    conditions.push(`status = $${values.length}::adm.record_status`);
  }

  if (params.search) {
    values.push(`%${params.search}%`);
    conditions.push(`(legal_name ILIKE $${values.length} OR display_name ILIKE $${values.length} OR external_code ILIKE $${values.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query<{ total: string } & QueryResultRow>(`SELECT COUNT(*) AS total FROM adm.customers ${whereClause}`, values);

  values.push(params.limit, params.offset);
  const result = await query<CustomerRow>(
    `
    ${customerSelect()}
    ${whereClause}
    ORDER BY display_name ASC
    LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return { items: result.rows, total: Number(countResult.rows[0]?.total ?? 0) };
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const result = await query<CustomerRow>(
    `
    ${customerSelect()}
    WHERE id = $1::uuid
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function createCustomer(input: CreateCustomerInput, actorId: string): Promise<Customer> {
  const result = await query<CustomerRow>(
    `
    INSERT INTO adm.customers (
      external_code,
      legal_name,
      display_name,
      tax_id,
      email,
      phone,
      status,
      global_suspension,
      global_suspension_reason,
      metadata,
      created_by,
      updated_by
    )
    VALUES ($1, $2, $3, $4, $5::citext, $6, COALESCE($7::adm.record_status, 'ACTIVE'), $8, $9, $10::jsonb, $11::uuid, $11::uuid)
    RETURNING
      id,
      external_code AS "externalCode",
      legal_name AS "legalName",
      display_name AS "displayName",
      tax_id AS "taxId",
      email::text AS email,
      phone,
      status::text AS status,
      global_suspension AS "globalSuspension",
      global_suspension_reason AS "globalSuspensionReason",
      metadata,
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    `,
    [
      input.externalCode ?? null,
      input.legalName,
      input.displayName,
      input.taxId ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.status ?? null,
      input.globalSuspension ?? false,
      input.globalSuspensionReason ?? null,
      JSON.stringify(input.metadata ?? {}),
      actorId
    ]
  );

  return result.rows[0];
}

export async function updateCustomer(id: string, input: UpdateCustomerInput, actorId: string): Promise<Customer | null> {
  const assignments: string[] = [];
  const values: unknown[] = [];

  function addAssignment(column: string, value: unknown, cast = '') {
    values.push(value);
    assignments.push(`${column} = $${values.length}${cast}`);
  }

  if (input.externalCode !== undefined) addAssignment('external_code', input.externalCode);
  if (input.legalName !== undefined) addAssignment('legal_name', input.legalName);
  if (input.displayName !== undefined) addAssignment('display_name', input.displayName);
  if (input.taxId !== undefined) addAssignment('tax_id', input.taxId);
  if (input.email !== undefined) addAssignment('email', input.email, '::citext');
  if (input.phone !== undefined) addAssignment('phone', input.phone);
  if (input.status !== undefined) addAssignment('status', input.status, '::adm.record_status');
  if (input.globalSuspension !== undefined) addAssignment('global_suspension', input.globalSuspension);
  if (input.globalSuspensionReason !== undefined) addAssignment('global_suspension_reason', input.globalSuspensionReason);
  if (input.metadata !== undefined) addAssignment('metadata', JSON.stringify(input.metadata), '::jsonb');

  addAssignment('updated_by', actorId, '::uuid');
  values.push(id);

  const result = await query<CustomerRow>(
    `
    UPDATE adm.customers
    SET ${assignments.join(', ')}
    WHERE id = $${values.length}::uuid
    RETURNING
      id,
      external_code AS "externalCode",
      legal_name AS "legalName",
      display_name AS "displayName",
      tax_id AS "taxId",
      email::text AS email,
      phone,
      status::text AS status,
      global_suspension AS "globalSuspension",
      global_suspension_reason AS "globalSuspensionReason",
      metadata,
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    `,
    values
  );

  return result.rows[0] ?? null;
}
