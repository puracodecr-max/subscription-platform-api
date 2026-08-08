import type { QueryResultRow } from 'pg';
import { query } from '../../database/pool';

export interface UserAuthRecord {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  status: string;
}

interface UserAuthRow extends QueryResultRow {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  status: string;
}

interface CodeRow extends QueryResultRow {
  code: string;
}

export async function findUserByEmail(email: string): Promise<UserAuthRecord | null> {
  const result = await query<UserAuthRow>(
    `
    SELECT
      id,
      email::text AS "email",
      full_name AS "fullName",
      password_hash AS "passwordHash",
      status::text AS "status"
    FROM adm.users
    WHERE email = $1::citext
    LIMIT 1
    `,
    [email]
  );

  return result.rows[0] ?? null;
}

export async function listRoleCodesByUserId(userId: string): Promise<string[]> {
  const result = await query<CodeRow>(
    `
    SELECT r.code
    FROM adm.user_roles ur
    INNER JOIN adm.roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1::uuid
      AND ur.status = 'ACTIVE'
      AND r.status = 'ACTIVE'
    ORDER BY r.code
    `,
    [userId]
  );

  return result.rows.map((row) => row.code);
}

export async function listPermissionCodesByUserId(userId: string): Promise<string[]> {
  const result = await query<CodeRow>(
    `
    SELECT DISTINCT p.code
    FROM adm.user_roles ur
    INNER JOIN adm.roles r ON r.id = ur.role_id
    INNER JOIN adm.role_permissions rp ON rp.role_id = r.id
    INNER JOIN adm.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = $1::uuid
      AND ur.status = 'ACTIVE'
      AND r.status = 'ACTIVE'
      AND rp.status = 'ACTIVE'
      AND p.status = 'ACTIVE'
    ORDER BY p.code
    `,
    [userId]
  );

  return result.rows.map((row) => row.code);
}

export async function markUserLogin(userId: string): Promise<void> {
  await query(
    `
    UPDATE adm.users
    SET last_login_at = now()
    WHERE id = $1::uuid
    `,
    [userId]
  );
}
