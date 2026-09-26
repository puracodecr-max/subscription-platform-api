-- 001_create_schema_extensions_types.sql
-- Creates the adm schema, required extensions, enum types and shared helper functions.

BEGIN;

CREATE SCHEMA IF NOT EXISTS adm;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'record_status'
  ) THEN
    CREATE TYPE adm.record_status AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'user_status'
  ) THEN
    CREATE TYPE adm.user_status AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'subscription_status'
  ) THEN
    CREATE TYPE adm.subscription_status AS ENUM (
      'TRIAL',
      'ACTIVE',
      'GRACE_PERIOD',
      'OVERDUE',
      'SUSPENDED',
      'CANCELLED',
      'EXPIRED'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'invoice_status'
  ) THEN
    CREATE TYPE adm.invoice_status AS ENUM (
      'ISSUED',
      'PARTIALLY_PAID',
      'PAID',
      'OVERDUE',
      'CANCELLED'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'invoice_item_type'
  ) THEN
    CREATE TYPE adm.invoice_item_type AS ENUM (
      'PLAN_FEE',
      'DISCOUNT',
      'TAX',
      'PENALTY',
      'ADJUSTMENT',
      'CREDIT',
      'OTHER'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'payment_status'
  ) THEN
    CREATE TYPE adm.payment_status AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'REVERSED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'payment_allocation_status'
  ) THEN
    CREATE TYPE adm.payment_allocation_status AS ENUM ('APPLIED', 'REVERSED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'penalty_type'
  ) THEN
    CREATE TYPE adm.penalty_type AS ENUM ('FIXED', 'PERCENTAGE', 'TIERED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'penalty_status'
  ) THEN
    CREATE TYPE adm.penalty_status AS ENUM ('APPLIED', 'WAIVED', 'CANCELLED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'billing_frequency'
  ) THEN
    CREATE TYPE adm.billing_frequency AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'suspension_type'
  ) THEN
    CREATE TYPE adm.suspension_type AS ENUM ('FINANCIAL', 'ADMINISTRATIVE');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'notification_channel'
  ) THEN
    CREATE TYPE adm.notification_channel AS ENUM ('EMAIL', 'IN_APP', 'SMS', 'WHATSAPP', 'PUSH');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'notification_status'
  ) THEN
    CREATE TYPE adm.notification_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ', 'CANCELLED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'plan_change_status'
  ) THEN
    CREATE TYPE adm.plan_change_status AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'APPLIED', 'CANCELLED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'extension_status'
  ) THEN
    CREATE TYPE adm.extension_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'service_token_status'
  ) THEN
    CREATE TYPE adm.service_token_status AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'webhook_event_status'
  ) THEN
    CREATE TYPE adm.webhook_event_status AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'idempotency_status'
  ) THEN
    CREATE TYPE adm.idempotency_status AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'adm' AND t.typname = 'job_execution_status'
  ) THEN
    CREATE TYPE adm.job_execution_status AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION adm.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION adm.current_jwt_claims()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  raw_claims text;
BEGIN
  raw_claims := current_setting('request.jwt.claims', true);

  IF raw_claims IS NULL OR btrim(raw_claims) = '' THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN raw_claims::jsonb;
EXCEPTION
  WHEN others THEN
    RETURN '{}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION adm.current_role_code()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(adm.current_jwt_claims() #>> '{app_metadata,role}', ''),
    NULLIF(adm.current_jwt_claims() #>> '{app_metadata,role_code}', ''),
    NULLIF(adm.current_jwt_claims() ->> 'role', ''),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION adm.current_customer_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  value text;
BEGIN
  value := COALESCE(
    NULLIF(adm.current_jwt_claims() #>> '{app_metadata,customer_id}', ''),
    NULLIF(adm.current_jwt_claims() ->> 'customer_id', '')
  );

  IF value IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN value::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

COMMIT;
