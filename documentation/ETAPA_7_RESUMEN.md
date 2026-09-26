# Etapa 7 — SDK para Integraciones (subscription-client-sdk)

## Resumen
SDK TypeScript para que backends externos integren la validación de acceso (`entitlements`) de `subscription-api`. Proporciona un cliente HTTP tipado, cache en memoria con TTL configurable, middleware Express de autorización y errores tipados con políticas fail-open/fail-closed.

## Estructura del paquete
```
subscription-client-sdk/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # Punto de entrada, exporta todo el SDK
    ├── types.ts          # Tipos: EntitlementResult, ValidateEntitlementInput, SdkConfig, ServiceTokenInfo
    ├── errors.ts         # Errores tipados: SdkError, InvalidConfigurationError, NetworkError, EntitlementDeniedError, UnexpectedResponseError
    ├── client.ts         # SubscriptionClient: método validateEntitlement con cache y retry
    ├── cache.ts          # MemoryCache<T>: cache genérico con TTL
    └── middleware.ts     # requireEntitlement: middleware Express de autorización
```

## Instalación
```bash
npm install @puracodecr-max/subscription-client-sdk@0.2.0-beta.1
```

## Uso básico
```typescript
import { SubscriptionClient } from '@puracodecr-max/subscription-client-sdk';

const client = new SubscriptionClient({
  baseUrl: 'http://localhost:3000',
  serviceToken: 'tu-service-token-aqui',
  timeoutMs: 10000,
  cacheTtlMs: 600000,
});

const result = await client.validateEntitlement({
  customerId: '00000000-0000-4000-8000-000000000001',
  applicationCode: 'CRM',
  tenantId: 'tenant_456',
  requestedModule: 'invoices',
});

if (!result.allowed) {
  console.log('Acceso denegado:', result.reason);
}
```

## Uso con middleware Express
```typescript
import express from 'express';
import { SubscriptionClient, requireEntitlement } from '@puracodecr-max/subscription-client-sdk';

const client = new SubscriptionClient({
  baseUrl: 'http://localhost:3000',
  serviceToken: 'tu-service-token',
});

const app = express();
app.use(authenticateUser);
app.use(requireEntitlement(client, {
  resolveContext: (req) => ({
    customerId: req.user.customerId,
    applicationCode: 'CRM',
  }),
  failureMode: 'closed',
}));

app.get('/protected', (req, res) => {
  const entitlement = (req as any).entitlement;
  res.json({ success: true, data: entitlement });
});
```

## Características
- **Cliente HTTP tipado**: `SubscriptionClient.validateEntitlement()` con respuestas `{ success, data }`
- **Cache en memoria**: TTL configurable por defecto 600s, evita llamadas redundantes
- **Timeout configurable**: Por defecto 10s, aborta peticiones lentas
- **Middleware Express**: `requireEntitlement` valida la suscripción después de autenticar al usuario
- **Errores tipados**: `EntitlementDeniedError`, `NetworkError`, `InvalidConfigurationError`, `UnexpectedResponseError`
- **Políticas fail-open/fail-closed**: denegaciones retornan 403; indisponibilidad retorna 503 en modo cerrado
- **Hash SHA-256**: Tokens se validan contra hash almacenado en BD
- **CORS habilitado**: La API permite orígenes externos para integraciones

## Endpoints del SDK (consumidos de subscription-api)
- `POST /api/v1/entitlements/validate` — Validación de acceso con token de servicio

## Verificación
- `npm run typecheck` — Pasa sin errores
- `npm run build` — Compila correctamente a `dist/`
- `npm audit --audit-level=moderate` — 0 vulnerabilidades
