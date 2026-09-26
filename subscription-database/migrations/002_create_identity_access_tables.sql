-- 002_create_identity_access_tables.sql
-- Creates users, roles, permissions and authorization mapping tables.

BEGIN;

CREATE TABLE IF NOT EXISTS adm.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text NULL,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT roles_code_unique UNIQUE (code),
  CONSTRAINT roles_code_format CHECK (code ~ '^[A-Z0-9_]+$')
);

CREATE TABLE IF NOT EXISTS adm.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  description text NULL,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT permissions_code_unique UNIQUE (code),
  CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action),
  CONSTRAINT permissions_code_format CHECK (code ~ '^[a-z0-9_.:-]+$')
);

CREATE TABLE IF NOT EXISTS adm.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL,
  full_name text NOT NULL,
  phone text NULL,
  password_hash text NOT NULL,
  status adm.user_status NOT NULL DEFAULT 'ACTIVE',
  last_login_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_password_hash_not_plain CHECK (length(password_hash) >= 20)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'roles_created_by_fk'
  ) THEN
    ALTER TABLE adm.roles
      ADD CONSTRAINT roles_created_by_fk FOREIGN KEY (created_by) REFERENCES adm.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'roles_updated_by_fk'
  ) THEN
    ALTER TABLE adm.roles
      ADD CONSTRAINT roles_updated_by_fk FOREIGN KEY (updated_by) REFERENCES adm.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'permissions_created_by_fk'
  ) THEN
    ALTER TABLE adm.permissions
      ADD CONSTRAINT permissions_created_by_fk FOREIGN KEY (created_by) REFERENCES adm.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'permissions_updated_by_fk'
  ) THEN
    ALTER TABLE adm.permissions
      ADD CONSTRAINT permissions_updated_by_fk FOREIGN KEY (updated_by) REFERENCES adm.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS adm.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES adm.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES adm.roles(id) ON DELETE RESTRICT,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  assigned_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS adm.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES adm.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES adm.permissions(id) ON DELETE CASCADE,
  status adm.record_status NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES adm.users(id) ON DELETE SET NULL,
  CONSTRAINT role_permissions_role_permission_unique UNIQUE (role_id, permission_id)
);

COMMIT;
