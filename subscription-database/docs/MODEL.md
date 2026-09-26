# Database Model

## Objetivo
Documentar el modelo fisico inicial del esquema `adm` creado en la Etapa 2.

## Convenciones

- Todas las tablas usan `uuid` como identificador cuando aplica.
- Los campos monetarios usan `numeric`, nunca `float`.
- Las fechas operativas usan `date` cuando representan periodos o vencimientos.
- Las fechas de eventos usan `timestamptz`.
- Los metadatos flexibles usan `jsonb`.
- Las operaciones destructivas se evitan en entidades con historial financiero.

## Tipos enumerados

- `adm.record_status`: estado comun de catalogos.
- `adm.user_status`: estado de usuario.
- `adm.subscription_status`: ciclo de vida de suscripcion.
- `adm.invoice_status`: estado de factura.
- `adm.invoice_item_type`: tipo de linea de factura.
- `adm.payment_status`: estado de pago.
- `adm.payment_allocation_status`: estado de distribucion de pago.
- `adm.penalty_type`: tipo de multa.
- `adm.penalty_status`: estado de multa.
- `adm.billing_frequency`: frecuencia de plan.
- `adm.suspension_type`: tipo de suspension.
- `adm.notification_channel`: canal de notificacion.
- `adm.notification_status`: estado de notificacion.
- `adm.plan_change_status`: estado de cambio de plan.
- `adm.extension_status`: estado de prorroga.
- `adm.service_token_status`: estado de token de servicio.
- `adm.webhook_event_status`: estado de evento webhook.
- `adm.idempotency_status`: estado de clave idempotente.
- `adm.job_execution_status`: estado de job automatico.

## Tablas de seguridad

| Tabla | Proposito |
| --- | --- |
| `adm.users` | Usuarios administrativos o de autoservicio. |
| `adm.roles` | Roles iniciales como `SUPER_ADMIN` y `BILLING_ADMIN`. |
| `adm.permissions` | Permisos atomicos por recurso y accion. |
| `adm.user_roles` | Asignacion de roles a usuarios. |
| `adm.role_permissions` | Asignacion de permisos a roles. |

## Tablas comerciales

| Tabla | Proposito |
| --- | --- |
| `adm.customers` | Clientes que contratan aplicaciones. |
| `adm.tenants` | Segmentos o empresas secundarias por cliente. |
| `adm.branches` | Sedes o sucursales por cliente y tenant. |
| `adm.customer_contacts` | Contactos administrativos o financieros. |
| `adm.applications` | Aplicaciones ofrecidas con codigo unico. |
| `adm.currencies` | Catalogo de monedas. |
| `adm.exchange_rates` | Tasas de conversion historicas. |
| `adm.payment_methods` | Metodos de pago manuales o externos. |

## Tablas de planes y suscripciones

| Tabla | Proposito |
| --- | --- |
| `adm.plans` | Condiciones comerciales por aplicacion. |
| `adm.plan_features` | Caracteristicas incluidas por plan. |
| `adm.penalty_rules` | Reglas de multa reutilizables. |
| `adm.subscriptions` | Contratacion de una aplicacion por cliente. |
| `adm.subscription_status_history` | Historial de cambios de estado. |
| `adm.subscription_plan_changes` | Cambios de plan programados. |
| `adm.subscription_extensions` | Prorrogas de vencimiento. |

## Tablas financieras

| Tabla | Proposito |
| --- | --- |
| `adm.invoices` | Facturas por periodo con snapshot del plan. |
| `adm.invoice_items` | Lineas de factura. |
| `adm.payments` | Pagos registrados. |
| `adm.payment_allocations` | Distribucion de pagos en facturas. |
| `adm.penalties` | Multas aplicadas, condonadas o canceladas. |

## Tablas operativas

| Tabla | Proposito |
| --- | --- |
| `adm.service_tokens` | Tokens hasheados para integracion entre aplicaciones. |
| `adm.application_access_logs` | Registro de validaciones de acceso. |
| `adm.notifications` | Notificaciones por evento y canal. |
| `adm.audit_logs` | Auditoria de acciones criticas. |
| `adm.webhook_events` | Eventos externos idempotentes. |
| `adm.idempotency_keys` | Control de idempotencia por scope. |
| `adm.job_executions` | Ejecuciones de procesos automaticos. |

## Restricciones clave

- `adm.applications.code` es unico.
- `adm.plans` es unico por `application_id` y `code`.
- `adm.subscriptions` evita duplicados activos por cliente, aplicacion, tenant y sede.
- `adm.invoices` evita duplicados por suscripcion y periodo.
- `adm.penalties` evita multas duplicadas por factura y regla.
- `adm.payment_allocations` evita aplicar el mismo pago dos veces a la misma factura activa.
- `adm.idempotency_keys` evita reprocesar la misma operacion en el mismo scope.

## Funciones transaccionales iniciales

- `adm.is_valid_subscription_status_transition`
- `adm.record_audit_log`
- `adm.transition_subscription_status`
- `adm.recalculate_invoice_status`
- `adm.create_invoice`
- `adm.confirm_payment`
- `adm.reverse_payment`
- `adm.apply_penalty`
- `adm.waive_penalty`
- `adm.suspend_subscription`
- `adm.reactivate_subscription`

## RLS
RLS se habilita en todas las tablas del esquema `adm`.

Politicas iniciales:

- Lectura administrativa para `SUPER_ADMIN`, `BILLING_ADMIN`, `SUPPORT_AGENT` y `VIEWER`.
- Escritura administrativa directa para `SUPER_ADMIN` y `BILLING_ADMIN`.
- Lectura acotada a cliente para `CUSTOMER_ADMIN` en tablas con alcance por cliente.

La API debe aplicar permisos finos adicionales por endpoint.
