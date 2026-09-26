# Apply Migrations

## Objetivo
Explicar el orden para aplicar los SQL del modulo `subscription-database`.

## Requisitos

- PostgreSQL compatible con Supabase.
- Permiso para crear esquema, extensiones, tablas, funciones, indices y politicas RLS.
- Variable de conexion segura en el entorno, por ejemplo `DATABASE_URL`.

## Orden recomendado

Ejecutar los archivos en este orden exacto:

```text
migrations/001_create_schema_extensions_types.sql
migrations/002_create_identity_access_tables.sql
migrations/003_create_commercial_catalog_tables.sql
migrations/004_create_plans_subscriptions_tables.sql
migrations/005_create_financial_tables.sql
migrations/006_create_operations_audit_tables.sql
migrations/007_create_indexes_and_triggers.sql
functions/001_business_functions.sql
seeds/001_initial_catalogs.sql
rls/001_enable_rls_and_policies.sql
```

## Ejecucion automatizada usada

Desde `C:\Sistema administrador\subscription-platform\subscription-api`:

```powershell
npm run db:apply
```

Este comando lee `DATABASE_URL` desde el entorno o desde `subscription-api/.env`, configura `DB_SCHEMA=adm`, aplica los SQL en el orden recomendado y verifica objetos creados sin imprimir secretos. No depende de `C:\Proyecto\CRM_API_SERVER\.env`.

## Ejemplo con psql

Desde la carpeta `subscription-database`:

```powershell
psql "$env:DATABASE_URL" -f "migrations/001_create_schema_extensions_types.sql"
psql "$env:DATABASE_URL" -f "migrations/002_create_identity_access_tables.sql"
psql "$env:DATABASE_URL" -f "migrations/003_create_commercial_catalog_tables.sql"
psql "$env:DATABASE_URL" -f "migrations/004_create_plans_subscriptions_tables.sql"
psql "$env:DATABASE_URL" -f "migrations/005_create_financial_tables.sql"
psql "$env:DATABASE_URL" -f "migrations/006_create_operations_audit_tables.sql"
psql "$env:DATABASE_URL" -f "migrations/007_create_indexes_and_triggers.sql"
psql "$env:DATABASE_URL" -f "functions/001_business_functions.sql"
psql "$env:DATABASE_URL" -f "seeds/001_initial_catalogs.sql"
psql "$env:DATABASE_URL" -f "rls/001_enable_rls_and_policies.sql"
```

## Validaciones posteriores

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'adm'
ORDER BY table_name;

SELECT typname
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'adm'
ORDER BY typname;

SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'adm'
ORDER BY tablename, policyname;
```

## Advertencias

- No ejecutar en produccion sin backup y revision.
- No almacenar `DATABASE_URL` en archivos versionados.
- Ejecutar seeds antes de RLS para evitar bloqueos si se usan credenciales restringidas.
