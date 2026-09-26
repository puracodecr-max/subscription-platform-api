# ETAPA 3 - Backend base

## ETAPA ACTUAL
Etapa 3: backend base.

## Objetivo de la etapa
Crear `subscription-api` con configuracion, variables de entorno, conexion a Supabase/PostgreSQL, manejo de errores, autenticacion, roles, clientes, aplicaciones, planes y suscripciones.

## Analisis realizado

- Se uso como base la estructura `routes -> controller -> service -> repository` del backend de referencia.
- Se mantuvo Express por compatibilidad con las convenciones encontradas.
- Se implemento TypeScript estricto desde el inicio.
- Se conecto el backend a la misma `DATABASE_URL` usada por el backend de referencia, trabajando sobre el esquema `adm` definido en la Etapa 2.
- Se dejaron fuera facturas, pagos, multas avanzadas, entitlements, SDK, worker y frontend porque pertenecen a etapas posteriores.

## Decisiones tecnicas

- Framework: Express 5 con TypeScript.
- Base de datos: `pg` con SQL parametrizado.
- Esquema de base de datos: `DB_SCHEMA=adm` y `search_path=adm,public`.
- Validacion: DTO con Zod.
- Seguridad HTTP: Helmet, CORS controlado y rate limiting.
- Autenticacion: JWT firmado con `JWT_SECRET` obligatorio.
- Contrasenas: comparacion con bcrypt; no se usan contrasenas reversibles.
- Autorizacion: middleware `requirePermission` por permisos atomicos.
- Respuestas: formato uniforme de exito y error.
- Swagger: configuracion inicial en `/docs`.

## Estructura propuesta

```text
subscription-api/
|-- .env.example
|-- README.md
|-- package.json
|-- tsconfig.json
`-- src/
    |-- app.ts
    |-- server.ts
    |-- config/
    |-- database/
    |-- docs/
    |-- modules/
    |   |-- applications/
    |   |-- auth/
    |   |-- customers/
    |   |-- plans/
    |   |-- roles/
    |   `-- subscriptions/
    |-- routes/
    |-- shared/
    `-- types/
```

## Archivos creados

- `C:\Sistema administrador\subscription-platform\subscription-api\package.json`
- `C:\Sistema administrador\subscription-platform\subscription-api\package-lock.json`
- `C:\Sistema administrador\subscription-platform\subscription-api\tsconfig.json`
- `C:\Sistema administrador\subscription-platform\subscription-api\.gitignore`
- `C:\Sistema administrador\subscription-platform\subscription-api\.env.example`
- `C:\Sistema administrador\subscription-platform\subscription-api\.env` local no versionado, creado con la misma conexion del backend de referencia.
- `C:\Sistema administrador\subscription-platform\subscription-api\README.md`
- `C:\Sistema administrador\subscription-platform\subscription-api\scripts\apply-database.js`
- `C:\Sistema administrador\subscription-platform\subscription-api\scripts\create-admin.js`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\app.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\server.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\config\env.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\database\pool.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\docs\swagger.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\routes\index.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\types\express.d.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\errors\ApiError.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\errors\databaseError.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\errors\errorCodes.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\http\apiResponse.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\http\asyncHandler.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\http\pagination.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\http\requestContext.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\middleware\authenticate.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\middleware\errorHandler.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\middleware\notFoundHandler.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\middleware\requirePermission.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\middleware\validateRequest.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\validation\commonSchemas.ts`
- Archivos `*.dto.ts`, `*.types.ts`, `*.repository.ts`, `*.service.ts`, `*.controller.ts` y `*.routes.ts` para `auth`, `roles`, `customers`, `applications`, `plans` y `subscriptions`.
- `C:\Sistema administrador\subscription-platform\documentation\ETAPA_3_RESUMEN.md`

## Archivos modificados

- `C:\Sistema administrador\subscription-platform\README.md`
- `C:\Sistema administrador\subscription-platform\documentation\API.md`

## Codigo
Se creo codigo TypeScript ejecutable para el backend base.

## Migraciones o comandos

No se crearon migraciones nuevas en esta etapa.

Comandos previstos:

```powershell
npm install
npm run db:apply
npm run admin:create
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

Estos comandos fueron ejecutados durante la verificacion.

## Variables de entorno

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `DB_SCHEMA=adm`
- `DB_SSL`
- `DB_SSL_REJECT_UNAUTHORIZED`
- `VERIFY_DB_ON_START`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ALLOWED_ORIGINS`
- `SWAGGER_SERVER_URL`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`

## Como ejecutar

Desde `C:\Sistema administrador\subscription-platform\subscription-api`:

```powershell
npm install
npm run db:apply
npm run admin:create
npm run dev
```

## Como probar

```powershell
npm run typecheck
npm run build
```

Luego probar:

```text
GET /health
GET /api/v1
POST /api/v1/auth/login
```

## Pruebas realizadas

- `npm install`: dependencias instaladas y auditoria sin vulnerabilidades reportadas.
- `npm run db:apply`: migraciones, funciones, seeds y RLS aplicados en la base real con la misma `DATABASE_URL` del backend de referencia.
- `npm run admin:create -- --reset-password`: usuario `SUPER_ADMIN` inicial creado o actualizado.
- `npm run typecheck`: TypeScript estricto sin errores.
- `npm run build`: compilacion completa sin errores.
- `npm audit --audit-level=moderate`: 0 vulnerabilidades reportadas.
- Verificacion runtime: se cargo `createApp()` desde `dist/app` con variables dummy y sin conectar a base de datos.
- Verificacion real de API: `GET /health` respondio correctamente y `POST /api/v1/auth/login` autentico el usuario `admin@subscription.local` con rol `SUPER_ADMIN`.
- Verificacion en base real: `current_schema=adm`, 32 tablas, 78 politicas RLS, 6 roles, 34 permisos y 11 funciones de negocio.
- Verificacion estatica: no se detectaron caracteres no ASCII en `src` ni en documentacion propia.

## Riesgos o pendientes

- La `DATABASE_URL` debe ser la misma del backend de referencia, configurada en el `.env` local de `subscription-api`; no debe copiarse a archivos versionados.
- El usuario administrativo inicial ya existe; cambiar la clave temporal despues del primer acceso.
- Facturacion y pagos no se implementan en esta etapa; corresponden a Etapa 4.
- Multas avanzadas, suspension automatica y reactivacion financiera completa corresponden a Etapa 5.

## Resumen final
La Etapa 3 crea el backend base con estructura modular, configuracion, conexion a base de datos, autenticacion, autorizacion, errores uniformes y CRUD base de clientes, aplicaciones, planes y suscripciones.

Etapa finalizada. No continuare con la siguiente etapa hasta recibir la instruccion de continuar.
