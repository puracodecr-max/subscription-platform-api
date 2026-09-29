# SDK GitHub Packages

## Estado actual

El SDK de integracion esta publicado en GitHub Packages como paquete npm restringido:

```text
@puracodecr-max/subscription-client-sdk@0.2.0-beta.1
```

Repositorio fuente:

```text
https://github.com/puracodecr-max/subscription-platform-api
```

Workflow de publicacion:

```text
.github/workflows/publish-sdk.yml
```

Tag que publico la version actual:

```text
sdk-v0.2.0-beta.1
```

La ejecucion de GitHub Actions para esta version termino correctamente y el paquete fue verificado mediante instalacion real desde GitHub Packages.

## Para que sirve

`@puracodecr-max/subscription-client-sdk` se instala dentro de backends consumidores, por ejemplo `CRM_API_SERVER`. El SDK no reemplaza la autenticacion propia del CRM. Su funcion es consultar `subscription-api` con un token de servicio y decidir si el cliente tiene derecho a usar un modulo.

Flujo:

```text
CRM_API_SERVER
  -> subscription-client-sdk
  -> HTTPS POST /api/v1/entitlements/validate
  -> subscription-api
  -> PostgreSQL/Supabase
```

## Permisos necesarios

### Para publicar desde GitHub Actions

El workflow usa `GITHUB_TOKEN` del repositorio con:

```yaml
permissions:
  contents: read
  packages: write
```

No se necesita guardar un token personal para publicar desde el workflow.

### Para instalar desde Render

Render necesita una variable secreta:

```text
NPM_TOKEN=token_con_read_packages
```

El token debe pertenecer a una cuenta con acceso al paquete y permiso:

```text
read:packages
```

No debe subirse a Git.

## Configuracion del consumidor

El repositorio consumidor debe tener un `.npmrc` sin secretos:

```ini
@puracodecr-max:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

Instalacion con version exacta:

```bash
npm install @puracodecr-max/subscription-client-sdk@0.2.0-beta.1
```

Se recomienda version exacta, no rangos `^`, para despliegues reproducibles.

## Variables de Render para CRM_API_SERVER

```env
NPM_TOKEN=token_con_read_packages
SUBSCRIPTION_API_URL=https://subscription-api.onrender.com
SUBSCRIPTION_SERVICE_TOKEN=sat_xxxxxxxxx
SUBSCRIPTION_CUSTOMER_ID=00000000-0000-4000-8000-000000000001
SUBSCRIPTION_APPLICATION_CODE=CRM
SUBSCRIPTION_TIMEOUT_MS=15000
SUBSCRIPTION_CACHE_TTL_MS=300000
SUBSCRIPTION_DENIED_CACHE_TTL_MS=30000
```

`SUBSCRIPTION_API_URL` debe ser solo el origen, sin `/api/v1`. El SDK agrega `/api/v1` por defecto.

## Integracion esperada en CRM_API_SERVER

Orden recomendado por ruta:

```text
verifyToken
requireCrmEntitlement
requirePermission
controller
```

Ejemplo CommonJS:

```javascript
const { SubscriptionClient, requireEntitlement } = require('@puracodecr-max/subscription-client-sdk');

const subscriptionClient = new SubscriptionClient({
  baseUrl: process.env.SUBSCRIPTION_API_URL,
  serviceToken: process.env.SUBSCRIPTION_SERVICE_TOKEN,
  timeoutMs: Number(process.env.SUBSCRIPTION_TIMEOUT_MS || 15000),
  cacheTtlMs: Number(process.env.SUBSCRIPTION_CACHE_TTL_MS || 300000),
  deniedCacheTtlMs: Number(process.env.SUBSCRIPTION_DENIED_CACHE_TTL_MS || 30000),
});

function requireCrmEntitlement(requestedModule) {
  return requireEntitlement(subscriptionClient, {
    resolveContext: () => ({
      customerId: process.env.SUBSCRIPTION_CUSTOMER_ID,
      applicationCode: process.env.SUBSCRIPTION_APPLICATION_CODE || 'CRM',
      requestedModule,
    }),
    failureMode: 'closed',
  });
}

module.exports = { requireCrmEntitlement };
```

No se debe tomar `customerId`, `tenantId` ni `branchId` desde headers publicos.

## Publicar una nueva version

1. Modificar el SDK.
2. Ejecutar pruebas:

```bash
cd subscription-client-sdk
npm test
npm audit --omit=dev
```

3. Subir la version en `subscription-client-sdk/package.json` y `package-lock.json`.

Para otra beta:

```bash
npm version prerelease --preid=beta --no-git-tag-version
```

4. Commit y push a `main`.
5. Crear tag que coincida exactamente con la version:

```bash
git tag -a sdk-v0.2.0-beta.2 -m "Publish subscription client SDK 0.2.0-beta.2"
git push origin sdk-v0.2.0-beta.2
```

El workflow verifica que `sdk-vX.Y.Z` coincida con `package.json`. Si no coincide, falla antes de publicar.

## Verificar una version publicada

Con GitHub CLI autenticado con permisos de packages:

```bash
gh auth status
gh api "users/puracodecr-max/packages/npm/subscription-client-sdk/versions"
```

Con npm:

```bash
npm view @puracodecr-max/subscription-client-sdk@0.2.0-beta.1 version \
  --@puracodecr-max:registry=https://npm.pkg.github.com \
  --//npm.pkg.github.com/:_authToken=$NPM_TOKEN
```

## Rollback

En el consumidor, regresar a una version anterior exacta:

```bash
npm install @puracodecr-max/subscription-client-sdk@0.2.0-beta.1
```

Luego desplegar nuevamente el backend consumidor.

Si Render ya habia desplegado una version estable anterior, tambien puede usarse el rollback del deployment previo.

## Notas de seguridad

- `NPM_TOKEN` solo sirve para instalar el paquete; no es el token de servicio de suscripciones.
- `SUBSCRIPTION_SERVICE_TOKEN` solo debe vivir en backend, nunca en React.
- El modo `failureMode: 'closed'` debe usarse en operaciones sensibles.
- `failureMode: 'open'` solo continua ante errores transitorios de red, timeout, `408`, `425`, `429` o `5xx`.
- Errores `401/403`, configuracion invalida o respuestas malformadas permanecen cerrados.
