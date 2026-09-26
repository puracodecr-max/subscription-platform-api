-- 003_create_commercial_catalog_tables.sql
-- Creates commercial catalogs, customers, applications, tokens and access logs.

BEGIN;

CREATE TABLE IF NOT EXISTS adm.currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code char(3) NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  decimal_places smallint NOT NULL DEFAULT 2,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT currencies_code_unique UNIQUE (code),
  CONSTRAINT currencies_code_uppercase CHECK (code = upper(code)),
  CONSTRAINT currencies_decimal_places_range CHECK (decimal_places BETWEEN 0 AND 6)
);

CREATE TABLE IF NOT EXISTS adm.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency_id uuid NOT NULL REFERENCES adm.currencies(id) ON DELETE RESTRICT,
  to_currency_id uuid NOT NULL REFERENCES adm.currencies(id) ON DELETE RESTRICT,
  rate numeric(18,8) NOT NULL,
  effective_at timestamptz NOT NULL,
  source text NULL,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT exchange_rates_positive_rate CHECK (rate > 0),
  CONSTRAINT exchange_rates_distinct_currencies CHECK (from_currency_id <> to_currency_id),
  CONSTRAINT exchange_rates_unique_rate UNIQUE (from_currency_id, to_currency_id, effective_at)
);

CREATE TABLE IF NOT EXISTS adm.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_code text NULL,
  legal_name text NOT NULL,
  display_name text NOT NULL,
  tax_id text NULL,
  email citext NULL,
  phone text NULL,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  global_suspension boolean NOT NULL DEFAULT false,
  global_suspension_reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT customers_external_code_unique UNIQUE (external_code),
  CONSTRAINT customers_global_suspension_reason_required CHECK (
    global_suspension = false OR NULLIF(btrim(global_suspension_reason), '') IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS adm.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES adm.customers(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT tenants_customer_code_unique UNIQUE (customer_id, code),
  CONSTRAINT tenants_code_format CHECK (code ~ '^[A-Z0-9_:-]+$')
);

CREATE TABLE IF NOT EXISTS adm.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES adm.customers(id) ON DELETE RESTRICT,
  tenant_id uuid NULL REFERENCES adm.tenants(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT branches_code_format CHECK (code ~ '^[A-Z0-9_:-]+$')
);

CREATE TABLE IF NOT EXISTS adm.customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES adm.customers(id) ON DELETE RESTRICT,
  name text NOT NULL,
  email citext NULL,
  phone text NULL,
  role_name text NULL,
  is_primary boolean NOT NULL DEFAULT false,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS adm.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text NULL,
  modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT applications_code_unique UNIQUE (code),
  CONSTRAINT applications_code_format CHECK (code ~ '^[A-Z0-9_]+$'),
  CONSTRAINT applications_modules_array CHECK (jsonb_typeof(modules) = 'array')
);

CREATE TABLE IF NOT EXISTS adm.service_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NULL REFERENCES adm.applications(id) ON DELETE RESTRICT,
  name text NOT NULL,
  token_hash text NOT NULL,
  token_prefix text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  status adm.service_token_status NOT NULL DEFAULT 'ACTIVE',
  expires_at timestamptz NULL,
  revoked_at timestamptz NULL,
  last_used_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT service_tokens_hash_unique UNIQUE (token_hash),
  CONSTRAINT service_tokens_not_expired_at_creation CHECK (expires_at IS NULL OR expires_at > created_at),
  CONSTRAINT service_tokens_revoked_at_required CHECK (status <> 'REVOKED' OR revoked_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS adm.application_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES adm.applications(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES adm.customers(id) ON DELETE RESTRICT,
  subscription_id uuid NULL,
  service_token_id uuid NULL REFERENCES adm.service_tokens(id) ON DELETE SET NULL,
  allowed boolean NOT NULL,
  reason text NULL,
  subscription_status adm.subscription_status NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS adm.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text NULL,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT payment_methods_code_unique UNIQUE (code),
  CONSTRAINT payment_methods_code_format CHECK (code ~ '^[A-Z0-9_]+$')
);

COMMIT;
