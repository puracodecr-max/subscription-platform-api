-- 007_create_indexes_and_triggers.sql
-- Creates indexes and updated_at triggers.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS branches_customer_tenant_code_unique
  ON adm.branches (
    customer_id,
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    code
  );

CREATE UNIQUE INDEX IF NOT EXISTS customer_contacts_one_primary_per_customer
  ON adm.customer_contacts (customer_id)
  WHERE is_primary = true AND status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_per_scope
  ON adm.subscriptions (
    customer_id,
    application_id,
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE status IN ('TRIAL', 'ACTIVE', 'GRACE_PERIOD', 'OVERDUE', 'SUSPENDED');

CREATE UNIQUE INDEX IF NOT EXISTS payment_allocations_one_active_per_payment_invoice
  ON adm.payment_allocations (payment_id, invoice_id)
  WHERE status = 'APPLIED';

CREATE UNIQUE INDEX IF NOT EXISTS penalties_one_active_rule_per_invoice
  ON adm.penalties (invoice_id, penalty_rule_id)
  WHERE status <> 'CANCELLED';

CREATE UNIQUE INDEX IF NOT EXISTS notifications_deduplication_key_unique
  ON adm.notifications (deduplication_key)
  WHERE deduplication_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_customer_external_reference_unique
  ON adm.payments (customer_id, external_reference)
  WHERE external_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_customer_idempotency_key_unique
  ON adm.payments (customer_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_status_idx ON adm.users (status);
CREATE INDEX IF NOT EXISTS roles_status_idx ON adm.roles (status);
CREATE INDEX IF NOT EXISTS permissions_resource_action_idx ON adm.permissions (resource, action);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON adm.user_roles (user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON adm.user_roles (role_id);
CREATE INDEX IF NOT EXISTS role_permissions_role_id_idx ON adm.role_permissions (role_id);
CREATE INDEX IF NOT EXISTS role_permissions_permission_id_idx ON adm.role_permissions (permission_id);

CREATE INDEX IF NOT EXISTS customers_status_idx ON adm.customers (status);
CREATE INDEX IF NOT EXISTS customers_email_idx ON adm.customers (email);
CREATE INDEX IF NOT EXISTS tenants_customer_id_idx ON adm.tenants (customer_id);
CREATE INDEX IF NOT EXISTS branches_customer_id_idx ON adm.branches (customer_id);
CREATE INDEX IF NOT EXISTS branches_tenant_id_idx ON adm.branches (tenant_id);
CREATE INDEX IF NOT EXISTS customer_contacts_customer_id_idx ON adm.customer_contacts (customer_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON adm.applications (status);
CREATE INDEX IF NOT EXISTS service_tokens_application_id_idx ON adm.service_tokens (application_id);
CREATE INDEX IF NOT EXISTS service_tokens_status_idx ON adm.service_tokens (status);
CREATE INDEX IF NOT EXISTS application_access_logs_customer_app_idx ON adm.application_access_logs (customer_id, application_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS plans_application_id_idx ON adm.plans (application_id);
CREATE INDEX IF NOT EXISTS plans_status_idx ON adm.plans (status);
CREATE INDEX IF NOT EXISTS plan_features_plan_id_idx ON adm.plan_features (plan_id);
CREATE INDEX IF NOT EXISTS penalty_rules_plan_id_idx ON adm.penalty_rules (plan_id);
CREATE INDEX IF NOT EXISTS subscriptions_customer_id_idx ON adm.subscriptions (customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_application_id_idx ON adm.subscriptions (application_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON adm.subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_next_billing_date_idx ON adm.subscriptions (next_billing_date);
CREATE INDEX IF NOT EXISTS subscription_status_history_subscription_id_idx ON adm.subscription_status_history (subscription_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS subscription_plan_changes_subscription_id_idx ON adm.subscription_plan_changes (subscription_id, effective_date DESC);

CREATE INDEX IF NOT EXISTS invoices_subscription_id_idx ON adm.invoices (subscription_id);
CREATE INDEX IF NOT EXISTS invoices_customer_id_idx ON adm.invoices (customer_id);
CREATE INDEX IF NOT EXISTS invoices_status_due_date_idx ON adm.invoices (status, due_date);
CREATE INDEX IF NOT EXISTS invoices_balance_idx ON adm.invoices (balance_amount) WHERE balance_amount > 0;
CREATE INDEX IF NOT EXISTS invoice_items_invoice_id_idx ON adm.invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS payments_customer_id_idx ON adm.payments (customer_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON adm.payments (status);
CREATE INDEX IF NOT EXISTS payments_received_at_idx ON adm.payments (received_at DESC);
CREATE INDEX IF NOT EXISTS payment_allocations_payment_id_idx ON adm.payment_allocations (payment_id);
CREATE INDEX IF NOT EXISTS payment_allocations_invoice_id_idx ON adm.payment_allocations (invoice_id);
CREATE INDEX IF NOT EXISTS penalties_invoice_id_idx ON adm.penalties (invoice_id);
CREATE INDEX IF NOT EXISTS penalties_subscription_id_idx ON adm.penalties (subscription_id);
CREATE INDEX IF NOT EXISTS subscription_extensions_subscription_id_idx ON adm.subscription_extensions (subscription_id);
CREATE INDEX IF NOT EXISTS subscription_extensions_invoice_id_idx ON adm.subscription_extensions (invoice_id);

CREATE INDEX IF NOT EXISTS notifications_customer_id_idx ON adm.notifications (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_status_idx ON adm.notifications (status);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON adm.audit_logs (entity_name, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON adm.audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON adm.audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_events_status_idx ON adm.webhook_events (status, received_at DESC);
CREATE INDEX IF NOT EXISTS idempotency_keys_status_idx ON adm.idempotency_keys (status, locked_until);
CREATE INDEX IF NOT EXISTS job_executions_job_name_idx ON adm.job_executions (job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS customers_metadata_gin_idx ON adm.customers USING gin (metadata);
CREATE INDEX IF NOT EXISTS subscriptions_custom_settings_gin_idx ON adm.subscriptions USING gin (custom_settings);
CREATE INDEX IF NOT EXISTS audit_logs_old_values_gin_idx ON adm.audit_logs USING gin (old_values);
CREATE INDEX IF NOT EXISTS audit_logs_new_values_gin_idx ON adm.audit_logs USING gin (new_values);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'roles',
    'permissions',
    'users',
    'user_roles',
    'role_permissions',
    'currencies',
    'exchange_rates',
    'customers',
    'tenants',
    'branches',
    'customer_contacts',
    'applications',
    'service_tokens',
    'payment_methods',
    'plans',
    'plan_features',
    'penalty_rules',
    'subscriptions',
    'subscription_plan_changes',
    'invoices',
    'invoice_items',
    'payments',
    'payment_allocations',
    'penalties',
    'subscription_extensions',
    'notifications',
    'webhook_events',
    'idempotency_keys',
    'job_executions'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON adm.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON adm.%I FOR EACH ROW EXECUTE FUNCTION adm.set_updated_at()',
      table_name
    );
  END LOOP;
END $$;

COMMIT;
