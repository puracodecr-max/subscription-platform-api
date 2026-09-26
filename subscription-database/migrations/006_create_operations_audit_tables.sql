-- 006_create_operations_audit_tables.sql
-- Creates notifications, audit logs, webhooks, idempotency and job execution tables.

BEGIN;

CREATE TABLE IF NOT EXISTS adm.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NULL REFERENCES adm.customers(id) ON DELETE RESTRICT,
  subscription_id uuid NULL REFERENCES adm.subscriptions(id) ON DELETE RESTRICT,
  invoice_id uuid NULL REFERENCES adm.invoices(id) ON DELETE RESTRICT,
  event_key text NOT NULL,
  channel adm.notification_channel NOT NULL,
  recipient text NOT NULL,
  subject text NULL,
  body text NOT NULL,
  status adm.notification_status NOT NULL DEFAULT 'PENDING',
  scheduled_at timestamptz NULL,
  sent_at timestamptz NULL,
  read_at timestamptz NULL,
  deduplication_key text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT notifications_sent_at_required CHECK (status <> 'SENT' OR sent_at IS NOT NULL),
  CONSTRAINT notifications_read_at_required CHECK (status <> 'READ' OR read_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS adm.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_name text NOT NULL,
  entity_id uuid NULL,
  old_values jsonb NULL,
  new_values jsonb NULL,
  ip_address inet NULL,
  reason text NULL,
  source text NOT NULL DEFAULT 'API',
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT audit_logs_action_not_blank CHECK (NULLIF(btrim(action), '') IS NOT NULL),
  CONSTRAINT audit_logs_entity_not_blank CHECK (NULLIF(btrim(entity_name), '') IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS adm.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text NOT NULL,
  external_event_id text NOT NULL,
  status adm.webhook_event_status NOT NULL DEFAULT 'RECEIVED',
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  payload jsonb NOT NULL,
  signature_hash text NULL,
  error_details jsonb NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT webhook_events_provider_external_unique UNIQUE (provider, external_event_id),
  CONSTRAINT webhook_events_processed_at_required CHECK (status <> 'PROCESSED' OR processed_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS adm.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  scope text NOT NULL,
  request_hash text NULL,
  status adm.idempotency_status NOT NULL DEFAULT 'PROCESSING',
  response_body jsonb NULL,
  error_details jsonb NULL,
  locked_until timestamptz NULL,
  expires_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT idempotency_keys_scope_key_unique UNIQUE (scope, idempotency_key),
  CONSTRAINT idempotency_keys_key_not_blank CHECK (NULLIF(btrim(idempotency_key), '') IS NOT NULL),
  CONSTRAINT idempotency_keys_scope_not_blank CHECK (NULLIF(btrim(scope), '') IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS adm.job_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  status adm.job_execution_status NOT NULL DEFAULT 'RUNNING',
  processed_records integer NOT NULL DEFAULT 0,
  successful_records integer NOT NULL DEFAULT 0,
  failed_records integer NOT NULL DEFAULT 0,
  error_details jsonb NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT job_executions_counts_non_negative CHECK (
    processed_records >= 0 AND successful_records >= 0 AND failed_records >= 0
  ),
  CONSTRAINT job_executions_finished_at_required CHECK (status = 'RUNNING' OR finished_at IS NOT NULL)
);

COMMIT;
