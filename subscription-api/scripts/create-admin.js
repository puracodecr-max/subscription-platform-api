const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
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

async function main() {
  const apiEnv = parseEnvFile(apiEnvPath);
  const databaseUrl = process.env.DATABASE_URL || apiEnv.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL was not found in environment or subscription-api .env');
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@subscription.local').trim().toLowerCase();
  const fullName = (process.env.ADMIN_FULL_NAME || 'Subscription Super Admin').trim();
  const providedPassword = process.env.ADMIN_PASSWORD;
  const generatedPassword = providedPassword ? null : crypto.randomBytes(18).toString('base64url');
  const password = providedPassword || generatedPassword;
  const resetPassword = process.argv.includes('--reset-password') || process.env.ADMIN_RESET_PASSWORD === 'true';

  const client = new Client({
    connectionString: stripSslConnectionParams(databaseUrl),
    ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
    options: '-c search_path=adm,public'
  });

  await client.connect();

  try {
    await client.query('BEGIN');

    const roleResult = await client.query("SELECT id FROM adm.roles WHERE code = 'SUPER_ADMIN' AND status = 'ACTIVE' LIMIT 1");

    if (!roleResult.rows[0]) {
      throw new Error('SUPER_ADMIN role was not found. Run npm run db:apply first.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const roleId = roleResult.rows[0].id;
    const userResult = await client.query('SELECT id FROM adm.users WHERE email = $1::citext LIMIT 1', [email]);
    let userId = userResult.rows[0]?.id;
    let passwordChanged = false;

    if (!userId) {
      const inserted = await client.query(
        `
        INSERT INTO adm.users (email, full_name, password_hash, status)
        VALUES ($1::citext, $2, $3, 'ACTIVE')
        RETURNING id
        `,
        [email, fullName, passwordHash]
      );
      userId = inserted.rows[0].id;
      passwordChanged = true;
    } else if (resetPassword) {
      await client.query(
        `
        UPDATE adm.users
        SET full_name = $2,
            password_hash = $3,
            status = 'ACTIVE'
        WHERE id = $1::uuid
        `,
        [userId, fullName, passwordHash]
      );
      passwordChanged = true;
    } else {
      await client.query(
        `
        UPDATE adm.users
        SET full_name = $2,
            status = 'ACTIVE'
        WHERE id = $1::uuid
        `,
        [userId, fullName]
      );
    }

    await client.query(
      `
      INSERT INTO adm.user_roles (user_id, role_id, status)
      VALUES ($1::uuid, $2::uuid, 'ACTIVE')
      ON CONFLICT (user_id, role_id) DO UPDATE
      SET status = 'ACTIVE'
      `,
      [userId, roleId]
    );

    await client.query('COMMIT');

    console.info('[ok] SUPER_ADMIN user ready');
    console.info(`email=${email}`);

    if (passwordChanged && generatedPassword) {
      console.info(`generatedPassword=${generatedPassword}`);
      console.info('[warning] Store this password securely. It is not written to disk.');
    } else if (passwordChanged) {
      console.info('[ok] Password set from ADMIN_PASSWORD environment variable');
    } else {
      console.info('[ok] Existing password was not changed. Use --reset-password to reset it.');
    }
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
