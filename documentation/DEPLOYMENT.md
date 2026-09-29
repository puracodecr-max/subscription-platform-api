# Deployment

## Objetivo
Definir estrategia inicial de ambientes y configuracion. El despliegue real se implementara en etapas posteriores.

## Ambientes

- `local`: desarrollo en maquina local.
- `staging`: pruebas integradas con datos no productivos.
- `production`: entorno real.

## Componentes a desplegar

- `subscription-api`: servicio Node.js.
- `subscription-admin-web`: SPA React.
- `subscription-database`: migraciones SQL sobre Supabase PostgreSQL.
- `subscription-worker`: inicialmente Supabase Cron y funciones SQL; Node worker opcional despues.
- `subscription-client-sdk`: paquete reutilizable para aplicaciones existentes.

## Variables de entorno base

API:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ALLOWED_ORIGINS`
- `SWAGGER_SERVER_URL`
- `VERIFY_DB_ON_START`
- `SERVICE_TOKEN_PEPPER`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`

Frontend:

- `VITE_API_BASE_URL`

Database:

- `MIGRATE_SCHEMA=adm`
- `DATABASE_URL`

Backends consumidores del SDK en Render:

- `NPM_TOKEN`: token GitHub con permiso `read:packages`, usado solo durante el build.
- `SUBSCRIPTION_API_URL`: origen HTTPS de `subscription-api`, sin `/api/v1`.
- `SUBSCRIPTION_SERVICE_TOKEN`: token con scope `entitlements.validate`.
- `SUBSCRIPTION_CUSTOMER_ID`: UUID del cliente asociado al despliegue.
- `SUBSCRIPTION_APPLICATION_CODE`: codigo de aplicacion, por ejemplo `CRM`.
- `SUBSCRIPTION_TIMEOUT_MS`
- `SUBSCRIPTION_CACHE_TTL_MS`
- `SUBSCRIPTION_DENIED_CACHE_TTL_MS`

Los repositorios consumidores deben incluir un `.npmrc` sin secretos:

```ini
@puracodecr-max:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

El SDK se instala usando una version exacta:

```bash
npm install @puracodecr-max/subscription-client-sdk@0.2.0-beta.1
```

El flujo completo de GitHub Packages, tokens, actualizaciones y rollback esta en `documentation/SDK_GITHUB_PACKAGES.md`.

## Reglas de despliegue

- No subir archivos `.env`.
- No imprimir secretos durante build o arranque.
- Ejecutar migraciones antes de desplegar API que dependa de nuevas tablas.
- Ejecutar pruebas antes de promover a produccion.
- Hacer backup antes de cambios destructivos.
- Separar credenciales de lectura, escritura y administracion cuando sea posible.
- No usar rangos de version para el SDK en produccion; promover cada version de forma explicita.

## Observabilidad inicial

- Logs estructurados en API.
- Registro de auditoria en base de datos.
- Registro de ejecuciones automaticas en `adm.job_executions`.
- Healthcheck de API.
- Metricas de errores en entitlements y pagos.
