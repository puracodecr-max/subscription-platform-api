# Subscription API

Backend central de la plataforma de suscripciones.

## Estado
Etapas 3 a 8 completadas: API administrativa, facturacion, pagos, multas, prorrogas, validacion de acceso, SDK y frontend admin.

Este modulo contiene configuracion, conexion PostgreSQL/Supabase, errores uniformes, autenticacion, roles, clientes, aplicaciones, planes, suscripciones, facturas, pagos, multas, prorrogas y validacion de acceso.

## Requisitos

- Node.js 20 o superior recomendado.
- PostgreSQL/Supabase con migraciones de `subscription-database` aplicadas.
- Variables de entorno basadas en `.env.example`.

## Comandos

```powershell
npm install
npm run db:apply
npm run admin:create
npm run dev
npm run typecheck
npm run build
npm start
```

## Variables principales

- `DATABASE_URL`: conexion a PostgreSQL/Supabase.
- `DB_SCHEMA`: esquema de trabajo. Debe quedar en `adm`.
- `JWT_SECRET`: secreto obligatorio para firmar JWT, minimo 32 caracteres.
- `CORS_ALLOWED_ORIGINS`: lista separada por coma.
- `VERIFY_DB_ON_START`: si es `true`, valida conexion al iniciar.

## Base path

```text
/api/v1
```

## Base de datos

Usa una `DATABASE_URL` propia para la base de datos de suscripciones, configurada localmente en `.env`. No debe usar la conexion de `C:\Proyecto\CRM_API_SERVER`.

No se copia ni versiona el secreto. El esquema de trabajo debe ser `adm` mediante:

```text
DB_SCHEMA=adm
```

El pool configura `search_path=adm,public` y las consultas usan tablas calificadas como `adm.*`.

Para aplicar las migraciones contra la base de datos propia de suscripciones:

```powershell
npm run db:apply
```

El comando lee `DATABASE_URL` desde el entorno o desde `.env`, crea o actualiza la configuracion local de `subscription-api` y aplica los SQL de `subscription-database` en orden.

## Usuario administrador inicial

Crear o asegurar un usuario `SUPER_ADMIN`:

```powershell
npm run admin:create
```

Por defecto usa `admin@subscription.local` y genera una clave aleatoria si no se define `ADMIN_PASSWORD`.

Para definir credenciales propias:

```powershell
$env:ADMIN_EMAIL="admin@tu-dominio.com"
$env:ADMIN_PASSWORD="una-clave-segura"
npm run admin:create
```

Para resetear la clave de un usuario existente:

```powershell
$env:ADMIN_RESET_PASSWORD="true"
npm run admin:create
```

## Token de servicio para integraciones

Crear un token de servicio para `POST /api/v1/entitlements/validate`:

```powershell
$env:SERVICE_TOKEN_APPLICATION_CODE="HOTEL_RESERVATIONS"
npm run service-token:create
```

Si no se define `SERVICE_TOKEN_APPLICATION_CODE`, el token queda global. El valor plano se muestra una sola vez y solo se almacena su hash en base de datos.

## Endpoints base

- `GET /health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/roles`
- `GET /api/v1/roles/:id`
- `GET /api/v1/roles/:id/permissions`
- `POST /api/v1/customers`
- `GET /api/v1/customers`
- `GET /api/v1/customers/:id`
- `PATCH /api/v1/customers/:id`
- `POST /api/v1/applications`
- `GET /api/v1/applications`
- `GET /api/v1/applications/:id`
- `PATCH /api/v1/applications/:id`
- `POST /api/v1/plans`
- `GET /api/v1/plans`
- `GET /api/v1/plans/:id`
- `PATCH /api/v1/plans/:id`
- `POST /api/v1/subscriptions`
- `GET /api/v1/subscriptions`
- `GET /api/v1/subscriptions/:id`
- `PATCH /api/v1/subscriptions/:id`
- `POST /api/v1/subscriptions/:id/suspend`
- `POST /api/v1/subscriptions/:id/reactivate`
- `POST /api/v1/subscriptions/:id/cancel`
- `POST /api/v1/subscriptions/:id/change-plan`
- `GET /api/v1/invoices`
- `GET /api/v1/invoices/:id`
- `POST /api/v1/invoices/generate`
- `POST /api/v1/invoices/:id/adjustments`
- `POST /api/v1/invoices/:id/cancel`
- `GET /api/v1/payments`
- `GET /api/v1/payments/:id`
- `POST /api/v1/payments`
- `POST /api/v1/payments/:id/confirm`
- `POST /api/v1/payments/:id/reject`
- `POST /api/v1/payments/:id/reverse`
- `GET /api/v1/penalties`
- `GET /api/v1/penalties/:id`
- `GET /api/v1/penalties/rules`
- `POST /api/v1/penalties/apply`
- `POST /api/v1/penalties/:id/waive`
- `GET /api/v1/extensions`
- `GET /api/v1/extensions/:id`
- `POST /api/v1/extensions`
- `POST /api/v1/extensions/:id/cancel`
- `POST /api/v1/entitlements/validate`

## Notas de seguridad

- No usar secretos por defecto en produccion.
- No exponer `DATABASE_URL` ni credenciales de Supabase en React.
- La API valida permisos por JWT y permisos atomicos.
- Las contrasenas deben almacenarse hasheadas con bcrypt.
