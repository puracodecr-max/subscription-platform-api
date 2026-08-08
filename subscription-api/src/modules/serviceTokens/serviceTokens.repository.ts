import { randomBytes } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import { query } from '../../database/pool';
import { hashServiceToken } from '../../shared/security/serviceTokenHash';
import type { CreateServiceTokenInput, RevokeServiceTokenInput } from './serviceTokens.dto';
import type { CreatedServiceToken, ServiceToken } from './serviceTokens.types';

interface ServiceTokenRow extends QueryResultRow, ServiceToken {}

function serviceTokenSelect() {
  return `
    SELECT
      st.id,
      st.application_id AS "applicationId",
      app.code AS "applicationCode",
      app.name AS "applicationName",
      st.name,
      st.token_prefix AS "tokenPrefix",
      st.scopes,
      st.status::text AS status,
      st.expires_at::text AS "expiresAt",
      st.revoked_at::text AS "revokedAt",
      st.last_used_at::text AS "lastUsedAt",
      st.created_at::text AS "createdAt",
      st.updated_at::text AS "updatedAt"
    FROM adm.service_tokens st
    LEFT JOIN adm.applications app ON app.id = st.application_id
  `;
}

export async function listServiceTokens(params: {
  limit: number;
  offset: number;
  applicationId?: string;
  status?: string;
}): Promise<{ items: ServiceToken[]; total: number }> {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.applicationId) {
    values.push(params.applicationId);
    conditions.push(`st.application_id = $${values.length}::uuid`);
  }

  if (params.status) {
    values.push(params.status);
    conditions.push(`st.status = $${values.length}::adm.service_token_status`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query<{ total: string } & QueryResultRow>(
    `SELECT COUNT(*) AS total FROM adm.service_tokens st ${whereClause}`,
    values
  );

  values.push(params.limit, params.offset);
  const result = await query<ServiceTokenRow>(
    `
    ${serviceTokenSelect()}
    ${whereClause}
    ORDER BY st.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return { items: result.rows, total: Number(countResult.rows[0]?.total ?? 0) };
}

export async function getServiceTokenById(id: string): Promise<ServiceToken | null> {
  const result = await query<ServiceTokenRow>(
    `
    ${serviceTokenSelect()}
    WHERE st.id = $1::uuid
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function createServiceToken(input: CreateServiceTokenInput, actorId: string): Promise<CreatedServiceToken> {
  const token = `sat_${randomBytes(32).toString('base64url')}`;
  const tokenHash = hashServiceToken(token);
  const tokenPrefix = token.slice(0, 12);

  const result = await query<{ id: string } & QueryResultRow>(
    `
    INSERT INTO adm.service_tokens (
      application_id,
      name,
      token_hash,
      token_prefix,
      scopes,
      expires_at,
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
      $5::text[],
      $6::timestamptz,
      'ACTIVE',
      $7::jsonb,
      $8::uuid,
      $8::uuid
    )
    RETURNING id
    `,
    [
      input.applicationId ?? null,
      input.name,
      tokenHash,
      tokenPrefix,
      input.scopes,
      input.expiresAt ?? null,
      JSON.stringify({ generatedBy: 'subscription-admin-web' }),
      actorId
    ]
  );

  const serviceToken = await getServiceTokenById(result.rows[0].id);

  if (!serviceToken) {
    throw new Error('Service token not found after creation');
  }

  return { token, serviceToken };
}

export async function revokeServiceToken(id: string, input: RevokeServiceTokenInput, actorId: string): Promise<ServiceToken | null> {
  await query(
    `
    UPDATE adm.service_tokens
    SET status = 'REVOKED',
        revoked_at = COALESCE(revoked_at, now()),
        metadata = metadata || $2::jsonb,
        updated_by = $3::uuid
    WHERE id = $1::uuid
      AND status <> 'REVOKED'
    `,
    [id, JSON.stringify({ revokedReason: input.reason ?? null }), actorId]
  );

  return getServiceTokenById(id);
}
