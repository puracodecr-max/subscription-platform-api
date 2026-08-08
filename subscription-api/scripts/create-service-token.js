const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const apiRoot = path.resolve(__dirname, '..');
const apiEnvPath = path.join(apiRoot, '.env');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const values = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function shouldUseSsl(databaseUrl) {
  return databaseUrl.includes('supabase.com') || databaseUrl.includes('sslmode=require');
}

function stripSslConnectionParams(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('sslcert');
    url.searchParams.delete('sslkey');
    url.searchParams.delete('sslrootcert');
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

function hashServiceToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseScopes(value) {
  return String(value || 'entitlements.validate')
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
}

async function main() {
  const apiEnv = parseEnvFile(apiEnvPath);
  const databaseUrl = process.env.DATABASE_URL || apiEnv.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL was not found in environment or subscription-api .env');
  }

  const applicationCode = (process.env.SERVICE_TOKEN_APPLICATION_CODE || '').trim().toUpperCase();
  const name = (process.env.SERVICE_TOKEN_NAME || 'Entitlements service token').trim();
  const scopes = parseScopes(process.env.SERVICE_TOKEN_SCOPES);
  const expiresAt = process.env.SERVICE_TOKEN_EXPIRES_AT || null;
  const token = process.env.SERVICE_TOKEN_VALUE || `sat_${crypto.randomBytes(32).toString('base64url')}`;
  const tokenHash = hashServiceToken(token);
  const tokenPrefix = token.slice(0, 12);

  const client = new Client({
    connectionString: stripSslConnectionParams(databaseUrl),
    ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
    options: '-c search_path=adm,public'
  });

  await client.connect();

  try {
    await client.query('BEGIN');

    let applicationId = null;

    if (applicationCode) {
      const applicationResult = await client.query(
        `
        SELECT id
        FROM adm.applications
        WHERE code = $1
          AND status = 'ACTIVE'
        LIMIT 1
        `,
        [applicationCode]
      );

      if (!applicationResult.rows[0]) {
        throw new Error(`Active application was not found for SERVICE_TOKEN_APPLICATION_CODE=${applicationCode}`);
      }

      applicationId = applicationResult.rows[0].id;
    }

    const inserted = await client.query(
      `
      INSERT INTO adm.service_tokens (
        application_id,
        name,
        token_hash,
        token_prefix,
        scopes,
        expires_at,
        status,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5::text[],
        $6::timestamptz,
        'ACTIVE',
        $7::jsonb
      )
      RETURNING id
      `,
      [applicationId, name, tokenHash, tokenPrefix, scopes, expiresAt, JSON.stringify({ generatedBy: 'create-service-token.js' })]
    );

    await client.query('COMMIT');

    console.info('[ok] Service token created');
    console.info(`id=${inserted.rows[0].id}`);
    console.info(`name=${name}`);
    console.info(`applicationCode=${applicationCode || '(global)'}`);
    console.info(`scopes=${scopes.join(',')}`);
    console.info(`token=${token}`);
    console.info('[warning] Store this token securely. It is not written to disk and cannot be recovered.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[error]', error.message);
  process.exit(1);
});
