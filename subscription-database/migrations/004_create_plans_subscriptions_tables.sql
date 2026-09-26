-- 004_create_plans_subscriptions_tables.sql
-- Creates plans, plan features, penalty rules and subscription history tables.

BEGIN;

CREATE TABLE IF NOT EXISTS adm.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES adm.applications(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  description text NULL,
  price numeric(14,2) NOT NULL,
  currency_id uuid NOT NULL REFERENCES adm.currencies(id) ON DELETE RESTRICT,
  frequency adm.billing_frequency NOT NULL DEFAULT 'MONTHLY',
  grace_period_days integer NOT NULL DEFAULT 5,
  suspension_after_due_days integer NOT NULL DEFAULT 10,
  penalty_type adm.penalty_type NOT NULL DEFAULT 'PERCENTAGE',
  penalty_value numeric(14,2) NOT NULL DEFAULT 5,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT plans_application_code_unique UNIQUE (application_id, code),
  CONSTRAINT plans_code_format CHECK (code ~ '^[A-Z0-9_]+$'),
  CONSTRAINT plans_price_non_negative CHECK (price >= 0),
  CONSTRAINT plans_grace_period_non_negative CHECK (grace_period_days >= 0),
  CONSTRAINT plans_suspension_days_non_negative CHECK (suspension_after_due_days >= 0),
  CONSTRAINT plans_penalty_value_non_negative CHECK (penalty_value >= 0),
  CONSTRAINT plans_percentage_penalty_range CHECK (
    penalty_type <> 'PERCENTAGE' OR penalty_value <= 100
  )
);

CREATE TABLE IF NOT EXISTS adm.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES adm.plans(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT plan_features_plan_code_unique UNIQUE (plan_id, code),
  CONSTRAINT plan_features_code_format CHECK (code ~ '^[A-Z0-9_]+$')
);

CREATE TABLE IF NOT EXISTS adm.penalty_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NULL REFERENCES adm.applications(id) ON DELETE RESTRICT,
  plan_id uuid NULL REFERENCES adm.plans(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  description text NULL,
  penalty_type adm.penalty_type NOT NULL,
  penalty_value numeric(14,2) NOT NULL,
  applies_after_grace boolean NOT NULL DEFAULT true,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT penalty_rules_code_unique UNIQUE (code),
  CONSTRAINT penalty_rules_code_format CHECK (code ~ '^[A-Z0-9_]+$'),
  CONSTRAINT penalty_rules_value_non_negative CHECK (penalty_value >= 0),
  CONSTRAINT penalty_rules_percentage_range CHECK (
    penalty_type <> 'PERCENTAGE' OR penalty_value <= 100
  )
);

CREATE TABLE IF NOT EXISTS adm.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES adm.customers(id) ON DELETE RESTRICT,
  tenant_id uuid NULL REFERENCES adm.tenants(id) ON DELETE RESTRICT,
  branch_id uuid NULL REFERENCES adm.branches(id) ON DELETE RESTRICT,
  application_id uuid NOT NULL REFERENCES adm.applications(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES adm.plans(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NULL,
  next_billing_date date NOT NULL,
  billing_day smallint NOT NULL,
  status adm.subscription_status NOT NULL DEFAULT 'TRIAL',
  auto_renew boolean NOT NULL DEFAULT true,
  administrative_suspension boolean NOT NULL DEFAULT false,
  administrative_suspension_reason text NULL,
  custom_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  cancelled_at timestamptz NULL,
  cancellation_reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT subscriptions_billing_day_range CHECK (billing_day BETWEEN 1 AND 31),
  CONSTRAINT subscriptions_date_order CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT subscriptions_admin_suspension_reason_required CHECK (
    administrative_suspension = false OR NULLIF(btrim(administrative_suspension_reason), '') IS NOT NULL
  ),
  CONSTRAINT subscriptions_cancel_reason_required CHECK (
    status <> 'CANCELLED' OR NULLIF(btrim(cancellation_reason), '') IS NOT NULL
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'application_access_logs_subscription_fk'
  ) THEN
    ALTER TABLE adm.application_access_logs
      ADD CONSTRAINT application_access_logs_subscription_fk
      FOREIGN KEY (subscription_id) REFERENCES adm.subscriptions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS adm.subscription_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES adm.subscriptions(id) ON DELETE RESTRICT,
  from_status adm.subscription_status NULL,
  to_status adm.subscription_status NOT NULL,
  reason text NULL,
  changed_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'SYSTEM',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT subscription_status_history_status_changed CHECK (
    from_status IS NULL OR from_status <> to_status
  )
);

CREATE TABLE IF NOT EXISTS adm.subscription_plan_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES adm.subscriptions(id) ON DELETE RESTRICT,
  old_plan_id uuid NOT NULL REFERENCES adm.plans(id) ON DELETE RESTRICT,
  new_plan_id uuid NOT NULL REFERENCES adm.plans(id) ON DELETE RESTRICT,
  requested_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  approved_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz NULL,
  effective_date date NOT NULL,
  status adm.plan_change_status NOT NULL DEFAULT 'REQUESTED',
  reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT subscription_plan_changes_distinct_plans CHECK (old_plan_id <> new_plan_id),
  CONSTRAINT subscription_plan_changes_approval_required CHECK (
    status NOT IN ('APPROVED', 'APPLIED') OR approved_by IS NOT NULL
  )
);

COMMIT;
