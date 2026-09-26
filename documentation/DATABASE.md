# Database

## Objetivo
Definir el modelo de base de datos para el esquema `adm`.

La implementacion inicial fue creada en `subscription-database` durante la Etapa 2.

## Esquema
El sistema usara el esquema PostgreSQL `adm`.

Motivos:

- Separar la administracion de suscripciones del esquema actual `ops`.
- Evitar colisiones con tablas existentes.
- Facilitar permisos, auditoria y politicas RLS por dominio.

## Criterios generales

- Usar `uuid` como identificador primario.
- Usar `timestamptz` para fechas con zona horaria.
- Usar `numeric(14,2)` o superior para dinero.
- No usar `float` para dinero.
- Usar `jsonb` para metadatos, snapshot de auditoria y configuraciones flexibles.
- Crear `created_at`, `updated_at`, `created_by`, `updated_by` cuando corresponda.
- Usar estado logico en entidades que no deben eliminarse fisicamente.
- Crear claves foraneas, indices, `CHECK` y `UNIQUE` segun reglas de negocio.
- Crear funciones transaccionales para operaciones financieras criticas.

## Tablas minimas previstas

- `adm.customers`
- `adm.applications`
- `adm.plans`
- `adm.plan_features`
- `adm.subscriptions`
- `adm.subscription_status_history`
- `adm.subscription_plan_changes`
- `adm.invoices`
- `adm.invoice_items`
- `adm.payments`
- `adm.payment_allocations`
- `adm.penalty_rules`
- `adm.penalties`
- `adm.subscription_extensions`
- `adm.notifications`
- `adm.audit_logs`
- `adm.users`
- `adm.roles`
- `adm.permissions`
- `adm.user_roles`
- `adm.role_permissions`
- `adm.job_executions`

## Tablas complementarias recomendadas

- `adm.tenants`
- `adm.branches`
- `adm.customer_contacts`
- `adm.payment_methods`
- `adm.currencies`
- `adm.exchange_rates`
- `adm.service_tokens`
- `adm.application_access_logs`
- `adm.webhook_events`
- `adm.idempotency_keys`

## Restricciones criticas previstas

- Una aplicacion debe tener `code` unico.
- Un plan pertenece a una aplicacion.
- Una suscripcion pertenece a un cliente, aplicacion y plan.
- No debe existir mas de una suscripcion activa por cliente y aplicacion, salvo tenant/sede.
- Una factura no se duplica para la misma suscripcion y periodo.
- Un pago confirmado no se actualiza destructivamente.
- Una multa no se duplica por factura y regla.
- Una clave de idempotencia no se procesa dos veces para la misma operacion.

## RLS
RLS se habilitara donde existan accesos con credenciales publicas o usuarios autenticados directos.

Las operaciones financieras deben ejecutarse desde `subscription-api` con permisos controlados, no desde React.

## Funciones transaccionales previstas

- Crear factura con detalles: `adm.create_invoice`.
- Confirmar pago y distribuirlo: `adm.confirm_payment`.
- Reversar pago: `adm.reverse_payment`.
- Aplicar multa: `adm.apply_penalty`.
- Condonar multa: `adm.waive_penalty`.
- Suspender suscripcion: `adm.suspend_subscription`.
- Reactivar suscripcion: `adm.reactivate_subscription`.
- Registrar auditoria: `adm.record_audit_log`.
- Validar transiciones: `adm.is_valid_subscription_status_transition`.

## Archivos de implementacion

- `subscription-database/migrations/001_create_schema_extensions_types.sql`
- `subscription-database/migrations/002_create_identity_access_tables.sql`
- `subscription-database/migrations/003_create_commercial_catalog_tables.sql`
- `subscription-database/migrations/004_create_plans_subscriptions_tables.sql`
- `subscription-database/migrations/005_create_financial_tables.sql`
- `subscription-database/migrations/006_create_operations_audit_tables.sql`
- `subscription-database/migrations/007_create_indexes_and_triggers.sql`
- `subscription-database/functions/001_business_functions.sql`
- `subscription-database/seeds/001_initial_catalogs.sql`
- `subscription-database/rls/001_enable_rls_and_policies.sql`
- `subscription-database/diagrams/logical_model.mmd`
