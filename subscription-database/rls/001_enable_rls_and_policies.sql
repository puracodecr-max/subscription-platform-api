-- 001_enable_rls_and_policies.sql
-- Enables RLS and creates baseline policies for admin and customer-scoped access.

BEGIN;

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
    'application_access_logs',
    'payment_methods',
    'plans',
    'plan_features',
    'penalty_rules',
    'subscriptions',
    'subscription_status_history',
    'subscription_plan_changes',
    'invoices',
    'invoice_items',
    'payments',
    'payment_allocations',
    'penalties',
    'subscription_extensions',
    'notifications',
    'audit_logs',
    'webhook_events',
    'idempotency_keys',
    'job_executions'
  ] LOOP
    EXECUTE format('ALTER TABLE adm.%I ENABLE ROW LEVEL SECURITY', table_name);

    EXECUTE format('DROP POLICY IF EXISTS admin_select ON adm.%I', table_name);
    EXECUTE format(
      'CREATE POLICY admin_select ON adm.%I FOR SELECT USING (adm.current_role_code() IN (''SUPER_ADMIN'', ''BILLING_ADMIN'', ''SUPPORT_AGENT'', ''VIEWER''))',
      table_name
    );

    EXECUTE format('DROP POLICY IF EXISTS admin_write ON adm.%I', table_name);
    EXECUTE format(
      'CREATE POLICY admin_write ON adm.%I FOR ALL USING (adm.current_role_code() IN (''SUPER_ADMIN'', ''BILLING_ADMIN'')) WITH CHECK (adm.current_role_code() IN (''SUPER_ADMIN'', ''BILLING_ADMIN''))',
      table_name
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS customer_admin_customers_select ON adm.customers;
CREATE POLICY customer_admin_customers_select
  ON adm.customers
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND id = adm.current_customer_id()
  );

DROP POLICY IF EXISTS customer_admin_tenants_select ON adm.tenants;
CREATE POLICY customer_admin_tenants_select
  ON adm.tenants
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND customer_id = adm.current_customer_id()
  );

DROP POLICY IF EXISTS customer_admin_branches_select ON adm.branches;
CREATE POLICY customer_admin_branches_select
  ON adm.branches
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND customer_id = adm.current_customer_id()
  );

DROP POLICY IF EXISTS customer_admin_contacts_select ON adm.customer_contacts;
CREATE POLICY customer_admin_contacts_select
  ON adm.customer_contacts
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND customer_id = adm.current_customer_id()
  );

DROP POLICY IF EXISTS customer_admin_subscriptions_select ON adm.subscriptions;
CREATE POLICY customer_admin_subscriptions_select
  ON adm.subscriptions
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND customer_id = adm.current_customer_id()
  );

DROP POLICY IF EXISTS customer_admin_subscription_history_select ON adm.subscription_status_history;
CREATE POLICY customer_admin_subscription_history_select
  ON adm.subscription_status_history
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND EXISTS (
      SELECT 1
      FROM adm.subscriptions s
      WHERE s.id = subscription_id
        AND s.customer_id = adm.current_customer_id()
    )
  );

DROP POLICY IF EXISTS customer_admin_subscription_plan_changes_select ON adm.subscription_plan_changes;
CREATE POLICY customer_admin_subscription_plan_changes_select
  ON adm.subscription_plan_changes
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND EXISTS (
      SELECT 1
      FROM adm.subscriptions s
      WHERE s.id = subscription_id
        AND s.customer_id = adm.current_customer_id()
    )
  );

DROP POLICY IF EXISTS customer_admin_invoices_select ON adm.invoices;
CREATE POLICY customer_admin_invoices_select
  ON adm.invoices
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND customer_id = adm.current_customer_id()
  );

DROP POLICY IF EXISTS customer_admin_invoice_items_select ON adm.invoice_items;
CREATE POLICY customer_admin_invoice_items_select
  ON adm.invoice_items
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND EXISTS (
      SELECT 1
      FROM adm.invoices i
      WHERE i.id = invoice_id
        AND i.customer_id = adm.current_customer_id()
    )
  );

DROP POLICY IF EXISTS customer_admin_payments_select ON adm.payments;
CREATE POLICY customer_admin_payments_select
  ON adm.payments
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND customer_id = adm.current_customer_id()
  );

DROP POLICY IF EXISTS customer_admin_payment_allocations_select ON adm.payment_allocations;
CREATE POLICY customer_admin_payment_allocations_select
  ON adm.payment_allocations
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND EXISTS (
      SELECT 1
      FROM adm.invoices i
      WHERE i.id = invoice_id
        AND i.customer_id = adm.current_customer_id()
    )
  );

DROP POLICY IF EXISTS customer_admin_penalties_select ON adm.penalties;
CREATE POLICY customer_admin_penalties_select
  ON adm.penalties
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND EXISTS (
      SELECT 1
      FROM adm.invoices i
      WHERE i.id = invoice_id
        AND i.customer_id = adm.current_customer_id()
    )
  );

DROP POLICY IF EXISTS customer_admin_extensions_select ON adm.subscription_extensions;
CREATE POLICY customer_admin_extensions_select
  ON adm.subscription_extensions
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND EXISTS (
      SELECT 1
      FROM adm.subscriptions s
      WHERE s.id = subscription_id
        AND s.customer_id = adm.current_customer_id()
    )
  );

DROP POLICY IF EXISTS customer_admin_notifications_select ON adm.notifications;
CREATE POLICY customer_admin_notifications_select
  ON adm.notifications
  FOR SELECT
  USING (
    adm.current_role_code() = 'CUSTOMER_ADMIN'
    AND customer_id = adm.current_customer_id()
  );

COMMIT;
