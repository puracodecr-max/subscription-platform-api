# Migracion a BD Separada

## Objetivo
Mover todo el esquema `adm` de la plataforma de suscripciones a una base de datos propia, separada de la base usada por `CRM_API_SERVER`.

## Estado

Completado. El esquema `adm` fue aplicado y verificado en la nueva base de datos Supabase.

## Nueva conexion

```text
host=aws-0-us-east-2.pooler.supabase.com
port=6543
database=postgres
user=postgres.mxgkuzybhmaqkogqairv
schema=adm
```

La URL final debe tener este formato:

```text
postgresql://postgres.mxgkuzybhmaqkogqairv:PASSWORD@aws-0-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require
```

## Cambios aplicados

- `subscription-api/scripts/apply-database.js` ya no lee el `.env` de `CRM_API_SERVER`.
- `subscription-api/scripts/create-admin.js` ya no lee el `.env` de `CRM_API_SERVER`.
- `subscription-api/scripts/create-service-token.js` ya no lee el `.env` de `CRM_API_SERVER`.
- `subscription-api/.env.example` apunta a la nueva BD separada con placeholder `PASSWORD`.

## Pasos para ejecutar

Desde `subscription-api`:

```powershell
$env:DATABASE_URL="postgresql://postgres.mxgkuzybhmaqkogqairv:PASSWORD@aws-0-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require"
npm run db:apply
npm run admin:create
```

## Verificacion esperada

El script debe reportar:

- `current_schema: adm`
- al menos 30 tablas en `adm`
- politicas RLS creadas
- roles y permisos iniciales cargados
- funciones de negocio creadas

## Resultado verificado

- `current_schema: adm`
- tablas `adm`: 32
- politicas RLS: 78
- tipos `adm`: 104
- roles iniciales: 6
- permisos iniciales: 34
- funciones de negocio: 11
- usuario `SUPER_ADMIN`: creado/asegurado con email `admin@subscription.local`

## Integracion posterior

- `subscription-api/.env` debe quedar apuntando solo a la nueva BD.
- `CRM_API_SERVER` conserva su propia BD y no debe consultar tablas `adm` directamente.
- La comunicacion entre CRM y suscripciones debe hacerse por `subscription-api` usando el SDK o HTTP.
