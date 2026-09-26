# Subscription Platform

Sistema centralizado para administrar suscripciones, facturacion, pagos, multas, suspensiones, reactivaciones y validacion de acceso de varias aplicaciones.

## Estado actual
Estado al 25 de septiembre de 2026: backend administrativo implementado, panel operativo en repositorio independiente y SDK preparado para publicacion. Siguiente etapa: integrar el CRM y verificar el flujo completo.

Existen migraciones SQL, API con autenticacion, permisos, catalogos, suscripciones, facturacion, pagos, multas, prorrogas, tokens de servicio y validacion de acceso. El SDK incluye pruebas y un workflow de publicacion. El frontend React permite operaciones administrativas y conserva su propio repositorio Git en `subscription-admin-web`; no debe agregarse como repositorio embebido. La publicacion del SDK, los procesos programados y el despliegue deben verificarse en sus respectivos entornos.

## Objetivo
Convertir esta plataforma en la fuente central de verdad para responder si un cliente puede usar una aplicacion.

## Proyectos previstos

```text
subscription-platform/
|-- subscription-api/
|-- subscription-admin-web/
|-- subscription-database/
|-- subscription-worker/
|-- subscription-client-sdk/
`-- documentation/
```

## Decisiones base

- Backend recomendado: Express 5 con TypeScript estricto.
- Frontend recomendado: React 19, Vite, TypeScript, Bootstrap y componentes reutilizables.
- Base de datos: PostgreSQL en Supabase usando el esquema `adm`.
- Procesos automaticos iniciales: Supabase Cron como disparador y funciones PostgreSQL transaccionales.
- Integracion entre aplicaciones: SDK TypeScript con cache, middleware y tokens de servicio.
- Seguridad: ninguna clave `service_role` en React; operaciones financieras solo desde backend.

## Documentacion

- `documentation/ARCHITECTURE.md`: arquitectura, modulos, responsabilidades y flujos.
- `documentation/BUSINESS_RULES.md`: reglas de negocio, estados y transiciones.
- `documentation/DATABASE.md`: modelo de base de datos y archivos SQL de la Etapa 2.
- `documentation/API.md`: contrato REST inicial y formato de respuestas.
- `documentation/SECURITY.md`: reglas de seguridad, autenticacion, autorizacion y secretos.
- `documentation/DEPLOYMENT.md`: estrategia inicial de ambientes y configuracion.
- `documentation/INTEGRATION_GUIDE.md`: estrategia de integracion para aplicaciones existentes.
- `documentation/ETAPA_2_RESUMEN.md`: resumen de la base de datos creada.
- `documentation/ETAPA_3_RESUMEN.md`: resumen del backend base creado.

## Base de datos

El modulo `subscription-database` contiene:

- Migraciones versionadas para el esquema `adm`.
- Tablas de seguridad, clientes, aplicaciones, planes, suscripciones, facturas, pagos, multas, auditoria e integracion.
- Funciones transaccionales iniciales.
- Politicas RLS base.
- Seeds de roles, permisos, monedas, metodos de pago y regla de multa inicial.
- Diagrama logico en Mermaid.

## Backend base

El modulo `subscription-api` contiene:

- Express 5 con TypeScript estricto.
- Configuracion por variables de entorno.
- Conexion PostgreSQL/Supabase con `pg`.
- Seguridad HTTP con Helmet, CORS controlado y rate limiting.
- Respuestas uniformes `{ success, data, message }` y `{ success, error }`.
- Autenticacion JWT con contrasenas hasheadas con bcrypt.
- Autorizacion por permisos atomicos.
- Modulos base: auth, roles, customers, applications, plans y subscriptions.

## Orden de implementacion

1. Etapa 1: arquitectura y reglas.
2. Etapa 2: base de datos en esquema `adm`.
3. Estado al 25 de septiembre de 2026: backend administrativo implementado, panel operativo en repositorio independiente y SDK preparado para publicacion. Siguiente etapa: integrar el CRM y verificar el flujo completo.
4. Etapa 4: facturacion y pagos.
5. Etapa 5: multas y suspension.
6. Etapa 6: validacion de licencias y SDK.
7. Etapa 7: panel React.
8. Etapa 8: procesos automaticos.
9. Etapa 9: integracion con proyecto existente.
10. Etapa 10: pruebas y despliegue.
11. Etapa 11: preparacion para pasarela de pago.

## Pendientes de integracion y validacion

- Integrar CRM_API_SERVER con el SDK usando contexto de cliente confiable del servidor.
- Verificar suscripcion, factura, pago y permiso o bloqueo de acceso de extremo a extremo.
- Confirmar ejecucion de procesos automaticos y despliegue en staging antes de produccion.
- Los resumenes numerados son historicos; su numeracion no siempre coincide con el plan original.
