# Subscription Client SDK

Cliente TypeScript para validar acceso contra `subscription-api` desde backends de aplicaciones.

Version actual: `0.2.0-beta.1`. El paquete se distribuye de forma restringida mediante GitHub
Packages.

## Instalacion

Configurar el registro y el token en el backend consumidor:

```ini
@puracodecr-max:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

Instalar una version exacta:

```bash
npm install @puracodecr-max/subscription-client-sdk@0.2.0-beta.1
```

`NPM_TOKEN` necesita permiso `read:packages`. El consumidor debe usar Node.js 18 o posterior y
proporcionar Express 5 como peer dependency.

## Contrato

- `baseUrl` es el origen de la API, por ejemplo `https://subscriptions.example.com`.
- `apiPath` usa `/api/v1` por defecto.
- `serviceToken` solo se usa en llamadas salientes hacia `subscription-api`.
- La aplicacion consumidora autentica a sus propios usuarios antes del middleware.
- `resolveContext` obtiene el cliente y tenant desde contexto confiable del servidor.
- `failureMode` es `closed` por defecto.

## Cliente

```typescript
import { SubscriptionClient } from '@puracodecr-max/subscription-client-sdk';

const client = new SubscriptionClient({
  baseUrl: process.env.SUBSCRIPTION_API_URL!,
  serviceToken: process.env.SUBSCRIPTION_SERVICE_TOKEN!,
  timeoutMs: 5000,
  cacheTtlMs: 300000,
  deniedCacheTtlMs: 30000,
});

const result = await client.validateEntitlement({
  customerId: '00000000-0000-4000-8000-000000000001',
  applicationCode: 'CRM',
  requestedModule: 'bookings',
});
```

## Express

```typescript
import { requireEntitlement } from '@puracodecr-max/subscription-client-sdk';

app.use(authenticateUser);
app.use(requireEntitlement(client, {
  resolveContext: (req) => ({
    customerId: req.user.customerId,
    applicationCode: 'CRM',
    requestedModule: 'bookings',
  }),
  failureMode: 'closed',
}));
```

Una respuesta valida con `allowed: false` produce `403`. Un error de red o del servicio produce
`503` en modo `closed`. En modo `open`, la peticion continua y el error queda disponible en
`req.entitlementValidationError`.

El modo `open` solo aplica a timeout, errores de red, `408`, `425`, `429` y respuestas `5xx`.
Errores de autenticacion del servicio (`401`/`403`), configuracion, contexto o respuestas invalidas
permanecen cerrados.

Las autorizaciones permitidas se cachean durante `cacheTtlMs`. Las denegaciones usan
`deniedCacheTtlMs`, que por defecto es 30 segundos. La cache puede invalidarse explicitamente:

```typescript
client.invalidateEntitlement({ customerId, applicationCode: 'CRM', requestedModule: 'bookings' });
client.clearCache();
```

Errores exportados:

- `InvalidConfigurationError`
- `InvalidEntitlementInputError`
- `NetworkError`
- `TimeoutError`
- `HttpError`
- `UnexpectedResponseError`
- `EntitlementDeniedError`

No use headers publicos como fuente de `customerId`, `tenantId` o `branchId`.

## Verificacion

```bash
npm test
```

La suite compila el paquete y ejecuta pruebas unitarias y una integracion HTTP local contra el
artefacto CommonJS de `dist`.

## Publicacion

El workflow `.github/workflows/publish-sdk.yml` publica al crear un tag que coincida exactamente
con la version del paquete:

```bash
git tag sdk-v0.2.0-beta.1
git push origin sdk-v0.2.0-beta.1
```

Las versiones prerelease se publican con el tag npm `beta`; las estables usan `latest`.
