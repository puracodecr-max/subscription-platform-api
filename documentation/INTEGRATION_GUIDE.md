# Integration Guide

## Objetivo
Definir como una aplicacion existente debe integrarse con el sistema central de suscripciones.

## Principio principal
El backend de cada aplicacion debe validar la suscripcion antes de permitir operaciones principales.

React puede mostrar mensajes o pantallas bloqueadas, pero no decide el acceso real.

## Flujo recomendado

1. Autenticar usuario en la aplicacion existente.
2. Identificar el `customerId` asociado al usuario o tenant.
3. Identificar el `applicationCode` fijo de la aplicacion.
4. Ejecutar middleware de validacion antes de operaciones principales.
5. Consultar `subscription-api` usando token de servicio.
6. Cachear respuesta entre 5 y 15 minutos segun criticidad.
7. Bloquear operaciones sensibles si no se puede validar despues del limite permitido.

El token de servicio identifica al backend consumidor frente a `subscription-api`. No sustituye
el JWT de sus usuarios y nunca debe ser enviado al navegador.

## Middleware objetivo

Orden recomendado:

```text
authenticateUser
identifyCustomer
validateSubscription
authorizeOperation
```

El contexto de suscripcion debe salir de una fuente confiable del backend: sesion autenticada,
relacion persistida del tenant o configuracion del despliegue. No debe tomarse `customerId` de un
header o body controlado por el cliente.

Contrato recomendado:

```typescript
const entitlement = requireEntitlement(subscriptionClient, {
  resolveContext: (req) => ({
    customerId: req.user.customerId,
    applicationCode: 'CRM',
    requestedModule: 'bookings',
  }),
  failureMode: 'closed',
});
```

`failureMode: 'closed'` responde `503` si el servicio central no puede validar. El modo `open`
continua la peticion y deja el error en `req.entitlementValidationError`; debe reservarse para
operaciones no sensibles.

## Endpoint central

```text
POST /api/v1/entitlements/validate
```

Headers esperados:

```text
Authorization: Bearer SERVICE_TOKEN
Content-Type: application/json
```

Payload:

```json
{
  "customerId": "UUID",
  "applicationCode": "HOTEL_RESERVATIONS"
}
```

## Acceso permitido durante suspension

Una aplicacion suspendida debe permitir solo:

- Inicio de sesion.
- Estado de cuenta.
- Facturas.
- Pagos.
- Comprobantes.
- Soporte.
- Perfil.
- Cerrar sesion.

Debe bloquear:

- Crear reservaciones.
- Registrar ventas.
- Modificar inventario.
- Crear usuarios.
- Procesar operaciones.
- Generar nuevos movimientos.

## Cache

- TTL recomendado: 5 a 15 minutos.
- Guardar ultimo resultado valido con expiracion clara.
- Invalidar ante suspension o cambio critico cuando exista mecanismo de evento.
- No permitir acceso indefinido con autorizacion vieja.
- Configurar el SDK con `cacheTtlMs`; usar `0` para desactivar cache.

## Politica de fallos

- Endpoints no sensibles: pueden usar ultimo resultado valido por un periodo corto.
- Endpoints sensibles: fail-closed despues del limite permitido.
- Registrar errores de comunicacion con el servicio central.

## Integracion prevista con CRM_API_SERVER

La aplicacion `C:\Proyecto\CRM_API_SERVER` autentica usuarios con un JWT que contiene `id` y
`roleId`, pero actualmente no contiene un identificador de cliente de suscripciones. Si cada
despliegue del CRM corresponde a un unico cliente, el contexto debe resolverse desde variables del
servidor:

```javascript
const { SubscriptionClient, requireEntitlement } = require('@puracodecr-max/subscription-client-sdk');

const subscriptionClient = new SubscriptionClient({
  baseUrl: process.env.SUBSCRIPTION_API_URL,
  serviceToken: process.env.SUBSCRIPTION_SERVICE_TOKEN,
  cacheTtlMs: 300000,
  deniedCacheTtlMs: 30000,
});

const requireCrmEntitlement = (requestedModule) => requireEntitlement(subscriptionClient, {
  resolveContext: () => ({
    customerId: process.env.SUBSCRIPTION_CUSTOMER_ID,
    applicationCode: 'CRM',
    requestedModule,
  }),
  failureMode: 'closed',
});
```

El orden posterior de integracion sera `verifyToken`, `requireCrmEntitlement(...)` y finalmente
`requirePermission(...)`. Si una sola instancia del CRM llega a alojar varios clientes, se debera
persistir la relacion usuario/tenant con `customerId` en vez de usar una variable global.

El modo abierto no ignora errores de credenciales, contexto o contrato. Solo permite continuar
ante errores transitorios de red, timeout, rate limit o indisponibilidad `5xx`.
