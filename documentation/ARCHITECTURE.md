# Architecture

## Objetivo
Definir una plataforma modular que administre suscripciones de multiples aplicaciones y exponga una API central para administracion, facturacion y validacion de acceso.

## Principios

- El backend decide el acceso. React no debe ser responsable de permitir o bloquear operaciones.
- Las operaciones financieras son transaccionales e idempotentes.
- El esquema de base de datos del sistema sera `adm`.
- Cada aplicacion y cada suscripcion se gestionan de forma independiente.
- La deuda de una aplicacion no suspende automaticamente otras aplicaciones.
- Los datos historicos no se eliminan fisicamente cuando tienen impacto financiero o legal.
- Los secretos viven solo en backend, worker o entorno seguro de despliegue.
- Los contratos publicos se documentan con OpenAPI.

## Arquitectura general

```text
subscription-admin-web
        |
        | HTTPS REST + JWT admin
        v
subscription-api
        |
        | SQL transaccional con pg
        v
Supabase PostgreSQL schema adm
        ^
        |
Supabase Cron / subscription-worker

Aplicaciones existentes
        |
        | subscription-client-sdk + service token
        v
POST /api/v1/entitlements/validate
```

## Modulos

### subscription-api
Backend central en Node.js, Express 5 y TypeScript.

Responsabilidades:

- Autenticacion administrativa.
- Autorizacion por roles y permisos.
- Administracion de clientes.
- Administracion de aplicaciones.
- Administracion de planes.
- Administracion de suscripciones.
- Facturacion y pagos.
- Multas, prorrogas, suspensiones y reactivaciones.
- Validacion de acceso para aplicaciones consumidoras.
- Auditoria y respuestas uniformes.
- Swagger/OpenAPI.

Estructura prevista:

```text
subscription-api/src/
|-- config/
|-- database/
|-- shared/
|   |-- errors/
|   |-- http/
|   |-- middleware/
|   `-- validation/
|-- modules/
|   |-- auth/
|   |-- users/
|   |-- roles/
|   |-- permissions/
|   |-- customers/
|   |-- applications/
|   |-- plans/
|   |-- subscriptions/
|   |-- invoices/
|   |-- payments/
|   |-- penalties/
|   |-- extensions/
|   |-- entitlements/
|   |-- notifications/
|   |-- audit-logs/
|   `-- dashboard/
`-- routes/
```

Cada modulo debe tener, cuando aplique:

- `*.routes.ts`
- `*.controller.ts`
- `*.service.ts`
- `*.repository.ts`
- `*.dto.ts`
- `*.types.ts`
- `*.test.ts`

### subscription-admin-web
Panel administrativo en React, Vite y TypeScript.

Responsabilidades:

- Login administrativo.
- Rutas protegidas.
- Dashboard.
- CRUD de clientes, aplicaciones, planes y suscripciones.
- Consulta y operacion controlada de facturas, pagos, multas y prorrogas.
- Auditoria y filtros.
- Estados de carga, error y vacio.

El frontend solo mejora la experiencia de usuario. La seguridad real vive en `subscription-api`.

### subscription-database
Modulo con migraciones SQL versionadas para PostgreSQL/Supabase.

Responsabilidades:

- Crear esquema `adm`.
- Crear tablas, restricciones, indices y funciones.
- Crear politicas RLS donde corresponda.
- Crear datos iniciales.
- Documentar modelo logico.
- Alojar funciones transaccionales para operaciones criticas.

### subscription-worker
Modulo para procesos automaticos.

Decision inicial:

- Usar Supabase Cron como disparador diario.
- Ejecutar funciones PostgreSQL idempotentes para facturacion, vencimientos, multas y suspensiones.
- Mantener el modulo preparado para worker Node.js cuando se necesiten colas, reintentos externos, email masivo o integraciones complejas.

### subscription-client-sdk
SDK TypeScript para integrar backends existentes.

Responsabilidades:

- Cliente HTTP para `subscription-api`.
- Validacion de acceso por cliente y aplicacion.
- Cache con TTL configurable.
- Middleware para Node.js/Express.
- Errores tipados.
- Politicas fail-open y fail-closed segun sensibilidad del endpoint.

### documentation
Documentacion tecnica y funcional compartida.

## Flujo de informacion

### Flujo administrativo

1. Un usuario administrativo inicia sesion en `subscription-admin-web`.
2. El frontend envia credenciales al endpoint de autenticacion.
3. `subscription-api` valida credenciales y permisos.
4. El usuario administra clientes, aplicaciones, planes, suscripciones, facturas o pagos.
5. El backend valida DTO, autorizacion y reglas de negocio.
6. El repositorio ejecuta SQL parametrizado sobre el esquema `adm`.
7. Toda operacion critica registra auditoria.

### Flujo de facturacion

1. El proceso automatico identifica suscripciones proximas a facturar.
2. Se genera una factura si no existe para la misma suscripcion y periodo.
3. La factura conserva precio, moneda, plan, periodo, descuento, multa, impuestos, total y saldo.
4. Pagos confirmados se distribuyen transaccionalmente contra facturas.
5. Facturas vencidas pasan a estado vencido si tienen saldo pendiente.

### Flujo de acceso a aplicaciones

1. Una aplicacion existente identifica usuario, cliente y aplicacion.
2. Su backend llama al SDK o middleware.
3. El SDK consulta `POST /api/v1/entitlements/validate` con token de servicio.
4. `subscription-api` responde si el acceso esta permitido, advertido o bloqueado.
5. El backend consumidor permite o bloquea operaciones segun la respuesta.
6. React puede mostrar avisos, pero no decide la autorizacion principal.

## Dependencias permitidas entre capas

- Controllers dependen de services.
- Services dependen de repositories y servicios compartidos.
- Repositories dependen de database pool o transaction client.
- Shared no debe depender de modulos de negocio.
- Frontend depende de contratos API, nunca de tablas ni de Supabase directo.
- SDK depende solo del contrato publico de entitlements.

## Decisiones tecnicas importantes

- Se prefiere SQL explicito con `pg` por consistencia con el backend de referencia y por control transaccional.
- No se usara Prisma en la primera version, salvo decision posterior, porque el proyecto de referencia lo tiene instalado pero no alineado con PostgreSQL.
- Se usara validacion de entrada en backend con DTO y esquemas.
- Se usara OpenAPI como contrato de endpoints.
- Se usara un formato unico de respuesta.
- Se usaran codigos de error estables.
- Se aplicara `created_at`, `updated_at`, `created_by`, `updated_by` y `status` cuando corresponda.
