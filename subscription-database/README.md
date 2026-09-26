# Subscription Database

Modulo de base de datos para la plataforma centralizada de suscripciones.

## Objetivo
Contener migraciones SQL versionadas, funciones transaccionales, politicas RLS, seeds, documentacion y diagrama logico del esquema `adm`.

## Estructura

```text
subscription-database/
|-- migrations/
|-- functions/
|-- rls/
|-- seeds/
|-- diagrams/
`-- docs/
```

## Orden de ejecucion

1. `migrations/001_create_schema_extensions_types.sql`
2. `migrations/002_create_identity_access_tables.sql`
3. `migrations/003_create_commercial_catalog_tables.sql`
4. `migrations/004_create_plans_subscriptions_tables.sql`
5. `migrations/005_create_financial_tables.sql`
6. `migrations/006_create_operations_audit_tables.sql`
7. `migrations/007_create_indexes_and_triggers.sql`
8. `functions/001_business_functions.sql`
9. `seeds/001_initial_catalogs.sql`
10. `rls/001_enable_rls_and_policies.sql`

## Esquema
Todas las tablas se crean en `adm`.

## Seguridad

- RLS se habilita sobre tablas del esquema `adm`.
- Las politicas son una base de seguridad por rol.
- La autorizacion fina debe aplicarse tambien en `subscription-api`.
- React no debe ejecutar operaciones financieras directas.

## Notas

- No usar `float` para montos.
- Las operaciones financieras criticas usan funciones transaccionales.
- Las restricciones unicas evitan duplicados de facturas, multas, pagos e idempotencia.
