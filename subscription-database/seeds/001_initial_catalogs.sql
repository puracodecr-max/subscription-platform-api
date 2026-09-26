-- 001_initial_catalogs.sql
-- Initial catalog data for roles, permissions, currencies, payment methods and default penalty rule.

BEGIN;

INSERT INTO adm.roles (code, name, description)
VALUES
  ('SUPER_ADMIN', 'Super administrator', 'Full platform administration'),
  ('BILLING_ADMIN', 'Billing administrator', 'Financial and subscription administration'),
  ('SUPPORT_AGENT', 'Support agent', 'Customer support with limited operational access'),
  ('VIEWER', 'Viewer', 'Read-only access'),
  ('APPLICATION_SERVICE', 'Application service', 'Service-to-service entitlement validation'),
  ('CUSTOMER_ADMIN', 'Customer administrator', 'Customer scoped self-service access')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = 'ACTIVE';

INSERT INTO adm.permissions (code, resource, action, description)
VALUES
  ('dashboard.read', 'dashboard', 'read', 'Read dashboard summary'),
  ('customers.read', 'customers', 'read', 'Read customers'),
  ('customers.write', 'customers', 'write', 'Create or update customers'),
  ('customers.suspend', 'customers', 'suspend', 'Apply global customer suspension'),
  ('applications.read', 'applications', 'read', 'Read applications'),
  ('applications.write', 'applications', 'write', 'Create or update applications'),
  ('plans.read', 'plans', 'read', 'Read plans'),
  ('plans.write', 'plans', 'write', 'Create or update plans'),
  ('subscriptions.read', 'subscriptions', 'read', 'Read subscriptions'),
  ('subscriptions.write', 'subscriptions', 'write', 'Create or update subscriptions'),
  ('subscriptions.suspend', 'subscriptions', 'suspend', 'Suspend subscriptions'),
  ('subscriptions.reactivate', 'subscriptions', 'reactivate', 'Reactivate subscriptions'),
  ('subscriptions.cancel', 'subscriptions', 'cancel', 'Cancel subscriptions'),
  ('subscriptions.change_plan', 'subscriptions', 'change_plan', 'Schedule plan changes'),
  ('invoices.read', 'invoices', 'read', 'Read invoices'),
  ('invoices.write', 'invoices', 'write', 'Create invoice records'),
  ('invoices.adjust', 'invoices', 'adjust', 'Apply authorized adjustments'),
  ('invoices.cancel', 'invoices', 'cancel', 'Cancel invoices'),
  ('payments.read', 'payments', 'read', 'Read payments'),
  ('payments.write', 'payments', 'write', 'Register payments'),
  ('payments.confirm', 'payments', 'confirm', 'Confirm payments'),
  ('payments.reject', 'payments', 'reject', 'Reject payments'),
  ('payments.reverse', 'payments', 'reverse', 'Reverse confirmed payments'),
  ('penalties.read', 'penalties', 'read', 'Read penalties'),
  ('penalties.write', 'penalties', 'write', 'Apply penalties'),
  ('penalties.waive', 'penalties', 'waive', 'Waive penalties'),
  ('extensions.read', 'extensions', 'read', 'Read payment extensions'),
  ('extensions.write', 'extensions', 'write', 'Create payment extensions'),
  ('notifications.read', 'notifications', 'read', 'Read notifications'),
  ('notifications.write', 'notifications', 'write', 'Create notifications'),
  ('audit_logs.read', 'audit_logs', 'read', 'Read audit logs'),
  ('security.read', 'security', 'read', 'Read security configuration'),
  ('security.write', 'security', 'write', 'Manage users, roles and permissions'),
  ('entitlements.validate', 'entitlements', 'validate', 'Validate application access')
ON CONFLICT (code) DO UPDATE
SET
  resource = EXCLUDED.resource,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  status = 'ACTIVE';

INSERT INTO adm.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM adm.roles r
CROSS JOIN adm.permissions p
WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT (role_id, permission_id) DO UPDATE
SET status = 'ACTIVE';

INSERT INTO adm.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM adm.roles r
JOIN adm.permissions p ON p.code IN (
  'dashboard.read',
  'customers.read',
  'customers.write',
  'applications.read',
  'applications.write',
  'plans.read',
  'plans.write',
  'subscriptions.read',
  'subscriptions.write',
  'subscriptions.suspend',
  'subscriptions.reactivate',
  'subscriptions.cancel',
  'subscriptions.change_plan',
  'invoices.read',
  'invoices.write',
  'invoices.adjust',
  'invoices.cancel',
  'payments.read',
  'payments.write',
  'payments.confirm',
  'payments.reject',
  'payments.reverse',
  'penalties.read',
  'penalties.write',
  'penalties.waive',
  'extensions.read',
  'extensions.write',
  'notifications.read',
  'notifications.write',
  'audit_logs.read'
)
WHERE r.code = 'BILLING_ADMIN'
ON CONFLICT (role_id, permission_id) DO UPDATE
SET status = 'ACTIVE';

INSERT INTO adm.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM adm.roles r
JOIN adm.permissions p ON p.code IN (
  'dashboard.read',
  'customers.read',
  'subscriptions.read',
  'subscriptions.suspend',
  'subscriptions.reactivate',
  'invoices.read',
  'payments.read',
  'penalties.read',
  'extensions.read',
  'notifications.read'
)
WHERE r.code = 'SUPPORT_AGENT'
ON CONFLICT (role_id, permission_id) DO UPDATE
SET status = 'ACTIVE';

INSERT INTO adm.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM adm.roles r
JOIN adm.permissions p ON p.action = 'read'
WHERE r.code = 'VIEWER'
ON CONFLICT (role_id, permission_id) DO UPDATE
SET status = 'ACTIVE';

INSERT INTO adm.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM adm.roles r
JOIN adm.permissions p ON p.code = 'entitlements.validate'
WHERE r.code = 'APPLICATION_SERVICE'
ON CONFLICT (role_id, permission_id) DO UPDATE
SET status = 'ACTIVE';

INSERT INTO adm.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM adm.roles r
JOIN adm.permissions p ON p.code IN (
  'subscriptions.read',
  'invoices.read',
  'payments.read',
  'payments.write',
  'notifications.read'
)
WHERE r.code = 'CUSTOMER_ADMIN'
ON CONFLICT (role_id, permission_id) DO UPDATE
SET status = 'ACTIVE';

INSERT INTO adm.currencies (code, name, symbol, decimal_places)
VALUES
  ('USD', 'US Dollar', '$', 2),
  ('CRC', 'Costa Rican Colon', 'CRC', 2)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  symbol = EXCLUDED.symbol,
  decimal_places = EXCLUDED.decimal_places,
  status = 'ACTIVE';

INSERT INTO adm.payment_methods (code, name, description)
VALUES
  ('MANUAL_BANK_TRANSFER', 'Manual bank transfer', 'Manual bank transfer registered by an administrator'),
  ('CASH', 'Cash', 'Cash payment registered manually'),
  ('CARD_EXTERNAL', 'External card payment', 'Card payment registered by an external provider'),
  ('OTHER', 'Other', 'Other manually registered payment method')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = 'ACTIVE';

INSERT INTO adm.penalty_rules (
  code,
  name,
  description,
  penalty_type,
  penalty_value,
  applies_after_grace
)
VALUES (
  'DEFAULT_LATE_FEE',
  'Default late fee',
  'Default 5 percent late fee applied once per invoice after grace period',
  'PERCENTAGE',
  5,
  true
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  penalty_type = EXCLUDED.penalty_type,
  penalty_value = EXCLUDED.penalty_value,
  applies_after_grace = EXCLUDED.applies_after_grace,
  status = 'ACTIVE';

COMMIT;
