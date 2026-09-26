# Etapa 9 - Admin Funcional

## Resumen
Se convirtio `subscription-admin-web` de panel de lectura a panel operativo inicial. Ahora permite iniciar sesion, crear y editar catalogos base, registrar suscripciones, generar facturas, registrar pagos y ejecutar acciones administrativas.

## Backend agregado

- `GET /api/v1/catalogs/currencies`
- `GET /api/v1/catalogs/payment-methods`
- `GET /api/v1/service-tokens`
- `GET /api/v1/service-tokens/:id`
- `POST /api/v1/service-tokens`
- `POST /api/v1/service-tokens/:id/revoke`

Estos endpoints alimentan formularios de planes y pagos sin pedir UUIDs manuales al usuario.

## Frontend agregado

- Login real usando `POST /auth/login`.
- Rutas protegidas con token JWT en `localStorage`.
- Layout con navegacion por `NavLink` y boton de logout.
- Estilos globales responsive.
- Dashboard corregido para leer la respuesta real de la API.
- Clientes: crear y editar.
- Aplicaciones: crear y editar.
- Planes: crear y editar con monedas.
- Suscripciones: crear, suspender, reactivar y cancelar.
- Facturas: generar, cancelar y aplicar ajustes.
- Pagos: registrar, confirmar, rechazar y reversar.
- Multas: aplicar y condonar.
- Prorrogas: crear y cancelar.
- Entitlements: validar acceso con service token.
- Service Tokens: listar, crear y revocar tokens desde el admin. El token plano solo se muestra una vez al crearlo.

## Verificacion

- `subscription-api`: `npm run build` correcto.
- `subscription-admin-web`: `npm run build` correcto con Vite 6.

## Pendiente recomendado

- Reemplazar prompts por modales dedicados.
- Agregar paginacion visual y filtros por modulo.
- Integrar `CRM_API_SERVER` con el SDK o llamada HTTP a `subscription-api`.
