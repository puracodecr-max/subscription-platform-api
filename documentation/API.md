# API

## Objetivo
Definir el contrato REST inicial para `subscription-api`.

La implementacion base de autenticacion, roles, clientes, aplicaciones, planes y suscripciones fue creada en la Etapa 3. Facturas y pagos fueron agregados en la Etapa 4.

## Base path

```text
/api/v1
```

## Formato de respuesta exitosa

```json
{
  "success": true,
  "data": {},
  "message": "Operacion realizada correctamente"
}
```

## Formato de respuesta con error

```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_SUSPENDED",
    "message": "La suscripcion se encuentra suspendida",
    "details": null
  }
}
```

## Codigos de error iniciales

- `CUSTOMER_NOT_FOUND`
- `ROLE_NOT_FOUND`
- `APPLICATION_NOT_FOUND`
- `PLAN_NOT_FOUND`
- `SUBSCRIPTION_NOT_FOUND`
- `SUBSCRIPTION_ALREADY_EXISTS`
- `INVALID_STATUS_TRANSITION`
- `INVOICE_NOT_FOUND`
- `INVOICE_ALREADY_EXISTS`
- `INVOICE_ALREADY_PAID`
- `INVOICE_NOT_ADJUSTABLE`
- `PAYMENT_NOT_FOUND`
- `PAYMENT_ALREADY_PROCESSED`
- `PAYMENT_AMOUNT_EXCEEDED`
- `PAYMENT_NOT_CONFIRMED`
- `PENALTY_ALREADY_APPLIED`
- `SUBSCRIPTION_SUSPENDED`
- `ADMINISTRATIVE_SUSPENSION`
- `OUTSTANDING_BALANCE`
- `UNAUTHORIZED_OPERATION`
- `FORBIDDEN_OPERATION`

## Endpoints administrativos iniciales

### Auth

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Roles

- `GET /roles`
- `GET /roles/:id`
- `GET /roles/:id/permissions`

### Catalogs

- `GET /catalogs/currencies`
- `GET /catalogs/payment-methods`

### Service Tokens

- `GET /service-tokens`
- `GET /service-tokens/:id`
- `POST /service-tokens`
- `POST /service-tokens/:id/revoke`

### Customers

- `POST /customers`
- `GET /customers`
- `GET /customers/:id`
- `PATCH /customers/:id`

### Applications

- `POST /applications`
- `GET /applications`
- `GET /applications/:id`
- `PATCH /applications/:id`

### Plans

- `POST /plans`
- `GET /plans`
- `GET /plans/:id`
- `PATCH /plans/:id`

### Subscriptions

- `POST /subscriptions`
- `GET /subscriptions`
- `GET /subscriptions/:id`
- `PATCH /subscriptions/:id`
- `POST /subscriptions/:id/suspend`
- `POST /subscriptions/:id/reactivate`
- `POST /subscriptions/:id/cancel`
- `POST /subscriptions/:id/change-plan`
- `POST /subscriptions/:id/extensions`

### Invoices

- `GET /invoices`
- `GET /invoices/:id`
- `POST /invoices/generate`
- `POST /invoices/:id/adjustments`
- `POST /invoices/:id/cancel`

### Payments

- `GET /payments`
- `GET /payments/:id`
- `POST /payments`
- `POST /payments/:id/confirm`
- `POST /payments/:id/reject`
- `POST /payments/:id/reverse`

### Penalties

- `GET /penalties`
- `GET /penalties/:id`
- `GET /penalties/rules`
- `POST /penalties/apply`
- `POST /penalties/:id/waive`

### Extensions

- `GET /extensions`
- `GET /extensions/:id`
- `POST /extensions`
- `POST /extensions/:id/cancel`

### Entitlements

- `POST /entitlements/validate`

## Endpoints financieros implementados

### `GET /invoices`

Lista facturas con paginacion y filtros opcionales:

- `customerId`
- `subscriptionId`
- `status`
- `dueFrom`
- `dueTo`
- `page`
- `limit`

### `GET /invoices/:id`

Devuelve factura, items y asignaciones de pagos.

### `POST /invoices/generate`

Genera una factura usando `adm.create_invoice`.

```json
{
  "subscriptionId": "UUID",
  "billingPeriodStart": "2026-08-01",
  "billingPeriodEnd": "2026-08-31",
  "issueDate": "2026-07-25",
  "dueDate": "2026-08-01",
  "idempotencyKey": "optional-key"
}
```

### `POST /invoices/:id/adjustments`

Aplica un cargo o credito autorizado de forma transaccional.

```json
{
  "type": "CHARGE",
  "description": "Ajuste manual",
  "amount": "10.00",
  "metadata": {}
}
```

### `POST /invoices/:id/cancel`

Anula una factura sin pagos aplicados.

```json
{
  "reason": "Factura emitida por error"
}
```

### `GET /payments`

Lista pagos con paginacion y filtros opcionales:

- `customerId`
- `status`
- `receivedFrom`
- `receivedTo`
- `page`
- `limit`

### `GET /payments/:id`

Devuelve pago y asignaciones a facturas.

### `POST /payments`

Registra un pago pendiente. No afecta saldos hasta confirmar.

```json
{
  "customerId": "UUID",
  "paymentMethodId": "UUID",
  "currencyId": "UUID",
  "externalReference": "BANK-123",
  "idempotencyKey": "payment-key",
  "amount": "100.00",
  "paidAt": "2026-08-02T12:00:00.000Z",
  "notes": "Transferencia bancaria",
  "metadata": {}
}
```

### `POST /payments/:id/confirm`

Confirma un pago pendiente usando `adm.confirm_payment`, distribuyendolo contra facturas pendientes del mismo cliente y moneda.

### `POST /payments/:id/reject`

Rechaza un pago pendiente.

```json
{
  "reason": "Referencia no encontrada"
}
```

### `POST /payments/:id/reverse`

Reversa un pago confirmado usando `adm.reverse_payment` y revierte asignaciones aplicadas.

```json
{
  "reason": "Pago reportado como devuelto"
}
```

### `GET /penalties`

Lista multas con paginacion y filtros opcionales:

- `invoiceId`
- `subscriptionId`
- `customerId`
- `status`
- `page`
- `limit`

### `GET /penalties/rules`

Lista reglas de multa disponibles para aplicar.

Filtros opcionales:

- `applicationId`
- `planId`
- `status`
- `page`
- `limit`

### `GET /penalties/:id`

Devuelve detalle de una multa, factura, cliente, aplicacion y regla usada.

### `POST /penalties/apply`

Aplica una multa usando `adm.apply_penalty`.

```json
{
  "invoiceId": "UUID",
  "penaltyRuleId": "UUID",
  "reason": "Factura vencida fuera de gracia",
  "metadata": {}
}
```

### `POST /penalties/:id/waive`

Condona una multa aplicada usando `adm.waive_penalty`.

```json
{
  "reason": "Condonacion autorizada",
  "metadata": {}
}
```

### `GET /extensions`

Lista prorrogas con paginacion y filtros opcionales:

- `subscriptionId`
- `invoiceId`
- `customerId`
- `status`
- `page`
- `limit`

### `GET /extensions/:id`

Devuelve detalle de una prorroga autorizada.

### `POST /extensions`

Crea una prorroga sin modificar silenciosamente la fecha original de la factura.

```json
{
  "subscriptionId": "UUID",
  "invoiceId": "UUID",
  "extendedDueDate": "2026-08-15",
  "reason": "Prorroga comercial autorizada",
  "reactivateIfEligible": false,
  "metadata": {}
}
```

Si no se envia `invoiceId`, `originalDueDate` es obligatorio.

### `POST /extensions/:id/cancel`

Cancela una prorroga activa.

```json
{
  "reason": "Prorroga revocada"
}
```

## Endpoints administrativos pendientes

### Notifications

- `GET /notifications`
- `PATCH /notifications/:id/read`

### Audit logs

- `GET /audit-logs`

### Dashboard

- `GET /dashboard/summary`

## Endpoint de validacion de acceso implementado

```text
POST /api/v1/entitlements/validate
```

Autenticacion:

```text
Authorization: Bearer SERVICE_TOKEN
```

El token debe existir en `adm.service_tokens`, estar `ACTIVE`, no estar vencido y tener alcance `entitlements.validate` o `*`.

Entrada:

```json
{
  "customerId": "UUID",
  "applicationCode": "HOTEL_RESERVATIONS",
  "tenantId": "UUID opcional",
  "branchId": "UUID opcional",
  "requestedModule": "operations opcional",
  "metadata": {}
}
```

Respuesta permitida:

```json
{
  "success": true,
  "data": {
    "allowed": true,
    "customerId": "UUID",
    "applicationCode": "HOTEL_RESERVATIONS",
    "applicationId": "UUID",
    "subscriptionId": "UUID",
    "subscriptionStatus": "ACTIVE",
    "validUntil": "2026-09-01T00:00:00Z",
    "reason": null,
    "gracePeriodEnd": null,
    "outstandingBalance": null,
    "daysOverdue": 0,
    "warningCode": null,
    "allowedModules": [],
    "blockedModules": []
  },
  "message": "Acceso permitido"
}
```

Respuesta bloqueada:

```json
{
  "success": true,
  "data": {
    "allowed": false,
    "customerId": "UUID",
    "applicationCode": "HOTEL_RESERVATIONS",
    "applicationId": "UUID",
    "subscriptionId": "UUID",
    "subscriptionStatus": "SUSPENDED",
    "validUntil": null,
    "reason": "PAYMENT_OVERDUE",
    "gracePeriodEnd": null,
    "outstandingBalance": null,
    "daysOverdue": 15,
    "warningCode": null,
    "allowedModules": ["account", "invoices", "payments", "support", "profile"],
    "blockedModules": ["operations"]
  },
  "message": "Acceso bloqueado"
}
```

## SDK para integraciones

El paquete `subscription-client-sdk` permite a backends externos integrar la validacion de acceso (`entitlements`) de `subscription-api`.

### Instalacion

```bash
npm install @puracodecr-max/subscription-client-sdk@0.2.0-beta.1
```

### Uso basico

```typescript
import { SubscriptionClient } from '@puracodecr-max/subscription-client-sdk';

const client = new SubscriptionClient({
  baseUrl: 'http://localhost:3000',
  serviceToken: 'tu-service-token',
  cacheTtlMs: 300000,
});

const result = await client.validateEntitlement({
  customerId: '00000000-0000-4000-8000-000000000001',
  applicationCode: 'CRM',
  requestedModule: 'invoices',
});
```

### Middleware Express

```typescript
import { requireEntitlement } from '@puracodecr-max/subscription-client-sdk';

app.use(authenticateUser);
app.use(requireEntitlement(client, {
  resolveContext: (req) => ({
    customerId: req.user.customerId,
    applicationCode: 'CRM',
  }),
  failureMode: 'closed',
}));
```

El token de servicio pertenece al backend consumidor y solo se envia desde el SDK hacia
`subscription-api`. El middleware no autentica usuarios ni acepta `customerId` desde headers
publicos; debe ejecutarse despues de la autenticacion propia de la aplicacion.

### Caracteristicas

- Cliente HTTP tipado con timeout configurable
- Cache en memoria con TTL para reducir llamadas redundantes
- Errores tipados: `EntitlementDeniedError`, `NetworkError`, `InvalidConfigurationError`
- Middleware Express para validacion automatica por request
- Politicas `open`/`closed` para errores de comunicacion, con `closed` por defecto

- Todas las entradas se validan con DTO.
- Todas las respuestas usan el formato uniforme.
- Los errores no exponen informacion sensible.
- Endpoints administrativos requieren JWT y permisos.
- Endpoints de integracion requieren token de servicio.
- Operaciones criticas aceptan `Idempotency-Key`.
- Operaciones financieras se ejecutan transaccionalmente.
