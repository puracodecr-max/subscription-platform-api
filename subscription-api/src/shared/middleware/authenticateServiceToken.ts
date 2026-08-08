import type { RequestHandler } from 'express';
import type { QueryResultRow } from 'pg';
import { query } from '../../database/pool';
import type { AuthenticatedServiceToken } from '../../modules/serviceTokens/serviceTokens.types';
import { ApiError } from '../errors/ApiError';
import { ErrorCodes } from '../errors/errorCodes';
import { hashServiceToken } from '../security/serviceTokenHash';

interface ServiceTokenRow extends QueryResultRow {
  id: string;
  applicationId: string | null;
  applicationCode: string | null;
  scopes: string[];
}

function hasRequiredScope(token: AuthenticatedServiceToken, requiredScope: string): boolean {
  return token.scopes.includes('*') || token.scopes.includes(requiredScope);
}

export function authenticateServiceToken(requiredScope: string): RequestHandler {
  return async (req, _res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      next(new ApiError('Service token is required', 401, ErrorCodes.UNAUTHORIZED_OPERATION));
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();

    if (!token) {
      next(new ApiError('Service token is required', 401, ErrorCodes.UNAUTHORIZED_OPERATION));
      return;
    }

    try {
      const result = await query<ServiceTokenRow>(
        `
        SELECT
          st.id,
          st.application_id AS "applicationId",
          app.code AS "applicationCode",
          st.scopes
        FROM adm.service_tokens st
        LEFT JOIN adm.applications app ON app.id = st.application_id
        WHERE st.token_hash = $1
          AND st.status = 'ACTIVE'
          AND (st.expires_at IS NULL OR st.expires_at > now())
        LIMIT 1
        `,
        [hashServiceToken(token)]
      );
      const serviceToken = result.rows[0] ?? null;

      if (!serviceToken) {
        next(new ApiError('Invalid service token', 401, ErrorCodes.UNAUTHORIZED_OPERATION));
        return;
      }

      if (!hasRequiredScope(serviceToken, requiredScope)) {
        next(new ApiError('Service token scope is not allowed', 403, ErrorCodes.FORBIDDEN_OPERATION));
        return;
      }

      await query('UPDATE adm.service_tokens SET last_used_at = now() WHERE id = $1::uuid', [serviceToken.id]);
      req.serviceToken = serviceToken;
      next();
    } catch (error) {
      next(error);
    }
  };
}
