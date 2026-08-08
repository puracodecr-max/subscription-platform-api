import type { QueryResultRow } from 'pg';
import { query } from '../../database/pool';
import type { Permission, Role } from './roles.types';

interface RoleRow extends QueryResultRow, Role {}
interface PermissionRow extends QueryResultRow, Permission {}

export async function listRoles(params: { limit: number; offset: number; status?: string }): Promise<{ items: Role[]; total: number }> {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.status) {
    values.push(params.status);
    conditions.push(`status = $${values.length}::adm.record_status`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query<{ total: string } & QueryResultRow>(`SELECT COUNT(*) AS total FROM adm.roles ${whereClause}`, values);

  values.push(params.limit, params.offset);
  const result = await query<RoleRow>(
    `
    SELECT
      id,
      code,
      name,
      description,
      status::text AS status,
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    FROM adm.roles
    ${whereClause}
    ORDER BY code ASC
    LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return { items: result.rows, total: Number(countResult.rows[0]?.total ?? 0) };
}

export async function getRoleById(id: string): Promise<Role | null> {
  const result = await query<RoleRow>(
    `
    SELECT
      id,
      code,
      name,
      description,
      status::text AS status,
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
    FROM adm.roles
    WHERE id = $1::uuid
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function listPermissionsByRoleId(roleId: string): Promise<Permission[]> {
  const result = await query<PermissionRow>(
    `
    SELECT
      p.id,
      p.code,
      p.resource,
      p.action,
      p.description,
      p.status::text AS status
    FROM adm.role_permissions rp
    INNER JOIN adm.permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = $1::uuid
      AND rp.status = 'ACTIVE'
    ORDER BY p.resource, p.action
    `,
    [roleId]
  );

  return result.rows;
}
