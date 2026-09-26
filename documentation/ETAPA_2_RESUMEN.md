# ETAPA 2 - Base de datos

## ETAPA ACTUAL
Etapa 2: base de datos.

## Objetivo de la etapa
Crear modelo de base de datos, migraciones, tablas, restricciones, indices, RLS, datos iniciales, funciones transaccionales y diagrama logico para el esquema `adm`.

## Analisis realizado

- Se uso como base la arquitectura y reglas de la Etapa 1.
- Se materializaron las tablas minimas requeridas.
- Se agregaron tablas complementarias necesarias para multiempresa, sedes, contactos, monedas, metodos de pago, tokens de servicio, logs de acceso, webhooks, idempotencia y procesos automaticos.
- Se definieron tipos enumerados para estados de negocio estables.
- Se mantuvo dinero en `numeric`, no en `float`.

## Decisiones tecnicas

- El esquema unico del modulo es `adm`.
- Se usa `uuid` con `gen_random_uuid()`.
- Se usa `citext` para emails y codigos sensibles a normalizacion.
- Las operaciones financieras usan funciones SQL transaccionales.
- Las restricciones unicas protegen contra facturas, multas y pagos duplicados.
- RLS queda habilitado como linea base, con escritura directa limitada a `SUPER_ADMIN` y `BILLING_ADMIN`; la autorizacion fina tambien debe implementarse en API.
- `tenants` y `branches` se incluyen desde esta etapa para soportar excepciones de multiples suscripciones activas por sede o tenant.

## Estructura propuesta

```text
subscription-database/
|-- README.md
|-- migrations/
|   |-- 001_create_schema_extensions_types.sql
|   |-- 002_create_identity_access_tables.sql
|   |-- 003_create_commercial_catalog_tables.sql
|   |-- 004_create_plans_subscriptions_tables.sql
|   |-- 005_create_financial_tables.sql
|   |-- 006_create_operations_audit_tables.sql
|   `-- 007_create_indexes_and_triggers.sql
|-- functions/
|   `-- 001_business_functions.sql
|-- rls/
|   `-- 001_enable_rls_and_policies.sql
|-- seeds/
|   `-- 001_initial_catalogs.sql
|-- diagrams/
|   `-- logical_model.mmd
`-- docs/
    |-- APPLY_MIGRATIONS.md
    `-- MODEL.md
```

## Archivos creados

- `C:\Sistema administrador\subscription-platform\subscription-database\README.md`
- `C:\Sistema administrador\subscription-platform\subscription-database\migrations\001_create_schema_extensions_types.sql`
- `C:\Sistema administrador\subscription-platform\subscription-database\migrations\002_create_identity_access_tables.sql`
- `C:\Sistema administrador\subscription-platform\subscription-database\migrations\003_create_commercial_catalog_tables.sql`
- `C:\Sistema administrador\subscription-platform\subscription-database\migrations\004_create_plans_subscriptions_tables.sql`
- `C:\Sistema administrador\subscription-platform\subscription-database\migrations\005_create_financial_tables.sql`
- `C:\Sistema administrador\subscription-platform\subscription-database\migrations\006_create_operations_audit_tables.sql`
- `C:\Sistema administrador\subscription-platform\subscription-database\migrations\007_create_indexes_and_triggers.sql`
- `C:\Sistema administrador\subscription-platform\subscription-database\functions\001_business_functions.sql`
- `C:\Sistema administrador\subscription-platform\subscription-database\rls\001_enable_rls_and_policies.sql`
- `C:\Sistema administrador\subscription-platform\subscription-database\seeds\001_initial_catalogs.sql`
- `C:\Sistema administrador\subscription-platform\subscription-database\diagrams\logical_model.mmd`
- `C:\Sistema administrador\subscription-platform\subscription-database\docs\APPLY_MIGRATIONS.md`
- `C:\Sistema administrador\subscription-platform\subscription-database\docs\MODEL.md`
- `C:\Sistema administrador\subscription-platform\documentation\ETAPA_2_RESUMEN.md`

## Archivos modificados

- `C:\Sistema administrador\subscription-platform\README.md`
- `C:\Sistema administrador\subscription-platform\documentation\DATABASE.md`

## Codigo
No se creo codigo Node.js ni React. Se crearon scripts SQL de base de datos.

## Migraciones o comandos

Orden de ejecucion:

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

## Variables de entorno

- `DATABASE_URL`: conexion PostgreSQL/Supabase para aplicar migraciones.
- `MIGRATE_SCHEMA=adm`: referencia operativa para herramientas de migracion si se automatiza despues.

## Como ejecutar

Desde `C:\Sistema administrador\subscription-platform\subscription-database`:

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

## Como probar

Despues de ejecutar las migraciones:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'adm'
ORDER BY table_name;

SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'adm'
ORDER BY tablename, policyname;
```

## Pruebas realizadas

- Se verifico la creacion local de archivos y carpetas.
- Se verifico que no existan caracteres no ASCII en archivos nuevos.
- Se reviso estaticamente el orden de migraciones, dependencias de FK y funciones.
- Se aplicaron los SQL contra la base real usando la misma `DATABASE_URL` del backend de referencia, sin imprimir el secreto.
- Verificacion en base real: `current_schema=adm`, 32 tablas en `adm`, 78 politicas RLS, 6 roles, 34 permisos y 11 funciones de negocio.

## Riesgos o pendientes

- Mantener backups antes de ejecutar cambios destructivos futuros.
- Ajustar politicas RLS finas si se decide exponer tablas directamente a usuarios autenticados.
- Agregar migracion automatizada con una herramienta en etapas posteriores.
- Completar procesos automaticos diarios en Etapa 8.
- Completar endpoints y casos de uso financieros desde la API en etapas 3 a 5.

## Resumen final
La Etapa 2 crea la base del esquema `adm`: tablas, restricciones, indices, triggers, funciones transaccionales, RLS, seeds, documentacion y diagrama logico.

Etapa finalizada. No continuare con la siguiente etapa hasta recibir la instruccion de continuar.
