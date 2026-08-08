import type { QueryResultRow } from 'pg';
import { query } from '../../database/pool';
import type { CreateApplicationInput, UpdateApplicationInput } from './applications.dto';
import type { Application } from './applications.types';

interface ApplicationRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  modules: unknown[];
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function applicationSelect() {
  return `
    SELECT
      id,
      code,
      name,
      description,
      modules,
      status::text AS status,
      metadata,
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    FROM adm.applications
  `;
}

export async function listApplications(params: {
  limit: number;
  offset: number;
  status?: string;
  search?: string;
}): Promise<{ items: Application[]; total: number }> {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.status) {
    values.push(params.status);
    conditions.push(`status = $${values.length}::adm.record_status`);
  }

  if (params.search) {
    values.push(`%${params.search}%`);
    conditions.push(`(code ILIKE $${values.length} OR name ILIKE $${values.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query<{ total: string } & QueryResultRow>(`SELECT COUNT(*) AS total FROM adm.applications ${whereClause}`, values);

  values.push(params.limit, params.offset);
  const result = await query<ApplicationRow>(
    `
    ${applicationSelect()}
    ${whereClause}
    ORDER BY code ASC
    LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return { items: result.rows, total: Number(countResult.rows[0]?.total ?? 0) };
}

export async function getApplicationById(id: string): Promise<Application | null> {
  const result = await query<ApplicationRow>(
    `
    ${applicationSelect()}
    WHERE id = $1::uuid
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function createApplication(input: CreateApplicationInput, actorId: string): Promise<Application> {
  const result = await query<ApplicationRow>(
    `
    INSERT INTO adm.applications (
      code,
      name,
      description,
      modules,
      status,
      metadata,
      created_by,
      updated_by
    )
    VALUES ($1, $2, $3, $4::jsonb, COALESCE($5::adm.record_status, 'ACTIVE'), $6::jsonb, $7::uuid, $7::uuid)
    RETURNING
      id,
      code,
      name,
      description,
      modules,
      status::text AS status,
      metadata,
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    `,
    [
      input.code,
      input.name,
      input.description ?? null,
      JSON.stringify(input.modules ?? []),
      input.status ?? null,
      JSON.stringify(input.metadata ?? {}),
      actorId
    ]
  );

  return result.rows[0];
}

export async function updateApplication(id: string, input: UpdateApplicationInput, actorId: string): Promise<Application | null> {
  const assignments: string[] = [];
  const values: unknown[] = [];

  function addAssignment(column: string, value: unknown, cast = '') {
    values.push(value);
    assignments.push(`${column} = $${values.length}${cast}`);
  }

  if (input.code !== undefined) addAssignment('code', input.code);
  if (input.name !== undefined) addAssignment('name', input.name);
  if (input.description !== undefined) addAssignment('description', input.description);
  if (input.modules !== undefined) addAssignment('modules', JSON.stringify(input.modules), '::jsonb');
  if (input.status !== undefined) addAssignment('status', input.status, '::adm.record_status');
  if (input.metadata !== undefined) addAssignment('metadata', JSON.stringify(input.metadata), '::jsonb');

  addAssignment('updated_by', actorId, '::uuid');
  values.push(id);

  const result = await query<ApplicationRow>(
    `
    UPDATE adm.applications
    SET ${assignments.join(', ')}
    WHERE id = $${values.length}::uuid
    RETURNING
      id,
      code,
      name,
      description,
      modules,
      status::text AS status,
      metadata,
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    `,
    values
  );

  return result.rows[0] ?? null;
}

export async function applicationExists(id: string): Promise<boolean> {
  const result = await query<{ exists: boolean } & QueryResultRow>(
    'SELECT EXISTS (SELECT 1 FROM adm.applications WHERE id = $1::uuid) AS exists',
    [id]
  );

  return result.rows[0]?.exists ?? false;
}
