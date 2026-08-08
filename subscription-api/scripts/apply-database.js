const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const apiRoot = path.resolve(__dirname, '..');
const platformRoot = path.resolve(apiRoot, '..');
const databaseRoot = path.join(platformRoot, 'subscription-database');
const apiEnvPath = path.join(apiRoot, '.env');

const sqlFiles = [
  'migrations/001_create_schema_extensions_types.sql',
  'migrations/002_create_identity_access_tables.sql',
  'migrations/003_create_commercial_catalog_tables.sql',
  'migrations/004_create_plans_subscriptions_tables.sql',
  'migrations/005_create_financial_tables.sql',
  'migrations/006_create_operations_audit_tables.sql',
  'migrations/007_create_indexes_and_triggers.sql',
  'functions/001_business_functions.sql',
  'seeds/001_initial_catalogs.sql',
  'rls/001_enable_rls_and_policies.sql'
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const values = {};

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

function formatEnvValue(value) {
  if (/\s/.test(value)) {
    return JSON.stringify(value);
  }

  return value;
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

function writeApiEnv(databaseUrl) {
  const current = parseEnvFile(apiEnvPath);
  const sslEnabled = shouldUseSsl(databaseUrl);
  const next = {
    NODE_ENV: current.NODE_ENV || 'development',
    PORT: current.PORT || '3000',
    DATABASE_URL: databaseUrl,
    DB_SCHEMA: 'adm',
    DB_SSL: current.DB_SSL || String(sslEnabled),
    DB_SSL_REJECT_UNAUTHORIZED: current.DB_SSL_REJECT_UNAUTHORIZED || (sslEnabled ? 'false' : 'true'),
    VERIFY_DB_ON_START: current.VERIFY_DB_ON_START || 'false',
    JWT_SECRET: current.JWT_SECRET || crypto.randomBytes(48).toString('hex'),
    JWT_EXPIRES_IN: current.JWT_EXPIRES_IN || '8h',
    CORS_ALLOWED_ORIGINS: current.CORS_ALLOWED_ORIGINS || 'http://localhost:5173',
    SWAGGER_SERVER_URL: current.SWAGGER_SERVER_URL || 'http://localhost:3000',
    RATE_LIMIT_WINDOW_MS: current.RATE_LIMIT_WINDOW_MS || '900000',
    RATE_LIMIT_MAX_REQUESTS: current.RATE_LIMIT_MAX_REQUESTS || '300'
  };

  const content = `${Object.entries(next)
    .map(([key, value]) => `${key}=${formatEnvValue(value)}`)
    .join('\n')}\n`;

  fs.writeFileSync(apiEnvPath, content, { encoding: 'utf8' });
}

async function runSqlFile(client, relativePath) {
  const absolutePath = path.join(databaseRoot, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`SQL file not found: ${relativePath}`);
  }

  const sql = fs.readFileSync(absolutePath, 'utf8');
  await client.query(sql);
  console.info(`[ok] ${relativePath}`);
}

async function verifyDatabase(client) {
  const results = await client.query(`
    SELECT
      current_schema() AS current_schema,
      (SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'adm') AS table_count,
      (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'adm') AS policy_count,
      (
        SELECT count(*)::int
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'adm'
      ) AS type_count,
      (SELECT count(*)::int FROM adm.roles) AS role_count,
      (SELECT count(*)::int FROM adm.permissions) AS permission_count,
      (
        SELECT count(*)::int
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'adm'
          AND p.proname IN (
            'is_valid_subscription_status_transition',
            'record_audit_log',
            'transition_subscription_status',
            'recalculate_invoice_status',
            'create_invoice',
            'confirm_payment',
            'reverse_payment',
            'apply_penalty',
            'waive_penalty',
            'suspend_subscription',
            'reactivate_subscription'
          )
      ) AS function_count
  `);

  const summary = results.rows[0];
  console.info('[verify] current_schema:', summary.current_schema);
  console.info('[verify] adm tables:', summary.table_count);
  console.info('[verify] adm policies:', summary.policy_count);
  console.info('[verify] adm types:', summary.type_count);
  console.info('[verify] roles:', summary.role_count);
  console.info('[verify] permissions:', summary.permission_count);
  console.info('[verify] business functions:', summary.function_count);

  if (summary.current_schema !== 'adm') {
    throw new Error('Expected current_schema to be adm');
  }

  if (summary.table_count < 30 || summary.policy_count < 30 || summary.function_count < 11) {
    throw new Error('Database verification returned fewer objects than expected');
  }
}

async function main() {
  const apiEnv = parseEnvFile(apiEnvPath);
  const databaseUrl = process.env.DATABASE_URL || apiEnv.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(`DATABASE_URL was not found in environment or ${apiEnvPath}`);
  }

  if (process.argv.includes('--write-api-env')) {
    writeApiEnv(databaseUrl);
    console.info('[ok] subscription-api .env updated with DATABASE_URL and DB_SCHEMA=adm');
  }

  const sslEnabled = shouldUseSsl(databaseUrl);
  const client = new Client({
    connectionString: stripSslConnectionParams(databaseUrl),
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    options: '-c search_path=adm,public'
  });

  await client.connect();

  try {
    for (const sqlFile of sqlFiles) {
      await runSqlFile(client, sqlFile);
    }

    await verifyDatabase(client);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[error]', error.message);
  process.exit(1);
});
