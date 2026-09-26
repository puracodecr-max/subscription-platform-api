-- 005_create_financial_tables.sql
-- Creates invoices, payments, allocations, penalties and subscription extensions.

BEGIN;

CREATE TABLE IF NOT EXISTS adm.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES adm.subscriptions(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES adm.customers(id) ON DELETE RESTRICT,
  application_id uuid NOT NULL REFERENCES adm.applications(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES adm.plans(id) ON DELETE RESTRICT,
  invoice_number text NOT NULL,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  plan_name_snapshot text NOT NULL,
  plan_price_snapshot numeric(14,2) NOT NULL,
  currency_id uuid NOT NULL REFERENCES adm.currencies(id) ON DELETE RESTRICT,
  base_amount numeric(14,2) NOT NULL DEFAULT 0,
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  penalty_amount numeric(14,2) NOT NULL DEFAULT 0,
  adjustment_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  balance_amount numeric(14,2) NOT NULL DEFAULT 0,
  status adm.invoice_status NOT NULL DEFAULT 'ISSUED',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT invoices_number_unique UNIQUE (invoice_number),
  CONSTRAINT invoices_subscription_period_unique UNIQUE (
    subscription_id,
    billing_period_start,
    billing_period_end
  ),
  CONSTRAINT invoices_period_order CHECK (billing_period_end > billing_period_start),
  CONSTRAINT invoices_due_after_issue CHECK (due_date >= issue_date),
  CONSTRAINT invoices_amounts_non_negative CHECK (
    plan_price_snapshot >= 0
    AND base_amount >= 0
    AND discount_amount >= 0
    AND tax_amount >= 0
    AND penalty_amount >= 0
    AND total_amount >= 0
    AND paid_amount >= 0
    AND balance_amount >= 0
  )
);

CREATE TABLE IF NOT EXISTS adm.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES adm.invoices(id) ON DELETE CASCADE,
  item_type adm.invoice_item_type NOT NULL,
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_amount numeric(14,2) NOT NULL DEFAULT 0,
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT invoice_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT invoice_items_discount_non_negative CHECK (discount_amount >= 0),
  CONSTRAINT invoice_items_tax_non_negative CHECK (tax_amount >= 0)
);

CREATE TABLE IF NOT EXISTS adm.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES adm.customers(id) ON DELETE RESTRICT,
  payment_method_id uuid NULL REFERENCES adm.payment_methods(id) ON DELETE RESTRICT,
  currency_id uuid NOT NULL REFERENCES adm.currencies(id) ON DELETE RESTRICT,
  external_reference text NULL,
  idempotency_key text NULL,
  amount numeric(14,2) NOT NULL,
  unapplied_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_at timestamptz NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz NULL,
  rejected_at timestamptz NULL,
  reversed_at timestamptz NULL,
  reversed_payment_id uuid NULL REFERENCES adm.payments(id) ON DELETE SET NULL,
  status adm.payment_status NOT NULL DEFAULT 'PENDING',
  notes text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT payments_amount_positive CHECK (amount > 0),
  CONSTRAINT payments_unapplied_amount_range CHECK (
    unapplied_amount >= 0 AND unapplied_amount <= amount
  ),
  CONSTRAINT payments_confirmed_at_required CHECK (status <> 'CONFIRMED' OR confirmed_at IS NOT NULL),
  CONSTRAINT payments_rejected_at_required CHECK (status <> 'REJECTED' OR rejected_at IS NOT NULL),
  CONSTRAINT payments_reversed_at_required CHECK (status <> 'REVERSED' OR reversed_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS adm.payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES adm.payments(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES adm.invoices(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL,
  applied_to_base numeric(14,2) NOT NULL DEFAULT 0,
  applied_to_tax numeric(14,2) NOT NULL DEFAULT 0,
  applied_to_penalty numeric(14,2) NOT NULL DEFAULT 0,
  status adm.payment_allocation_status NOT NULL DEFAULT 'APPLIED',
  allocated_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT payment_allocations_amount_positive CHECK (amount > 0),
  CONSTRAINT payment_allocations_parts_non_negative CHECK (
    applied_to_base >= 0 AND applied_to_tax >= 0 AND applied_to_penalty >= 0
  ),
  CONSTRAINT payment_allocations_parts_match_amount CHECK (
    amount = applied_to_base + applied_to_tax + applied_to_penalty
  ),
  CONSTRAINT payment_allocations_reversed_at_required CHECK (status <> 'REVERSED' OR reversed_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS adm.penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES adm.invoices(id) ON DELETE RESTRICT,
  subscription_id uuid NOT NULL REFERENCES adm.subscriptions(id) ON DELETE RESTRICT,
  penalty_rule_id uuid NOT NULL REFERENCES adm.penalty_rules(id) ON DELETE RESTRICT,
  base_amount numeric(14,2) NOT NULL,
  penalty_type adm.penalty_type NOT NULL,
  penalty_value numeric(14,2) NOT NULL,
  amount numeric(14,2) NOT NULL,
  status adm.penalty_status NOT NULL DEFAULT 'APPLIED',
  applied_at timestamptz NOT NULL DEFAULT now(),
  waived_at timestamptz NULL,
  waived_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  waived_reason text NULL,
  cancellation_reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT penalties_amounts_non_negative CHECK (
    base_amount >= 0 AND penalty_value >= 0 AND amount >= 0
  ),
  CONSTRAINT penalties_waived_reason_required CHECK (
    status <> 'WAIVED' OR NULLIF(btrim(waived_reason), '') IS NOT NULL
  ),
  CONSTRAINT penalties_cancel_reason_required CHECK (
    status <> 'CANCELLED' OR NULLIF(btrim(cancellation_reason), '') IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS adm.subscription_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES adm.subscriptions(id) ON DELETE RESTRICT,
  invoice_id uuid NULL REFERENCES adm.invoices(id) ON DELETE RESTRICT,
  original_due_date date NOT NULL,
  extended_due_date date NOT NULL,
  reason text NOT NULL,
  authorized_by uuid NOT NULL REFERENCES adm.users(id) ON DELETE RESTRICT,
  authorized_at timestamptz NOT NULL DEFAULT now(),
  status adm.extension_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT subscription_extensions_date_order CHECK (extended_due_date > original_due_date)
);

COMMIT;
