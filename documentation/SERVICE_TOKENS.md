# Service Tokens

## Objetivo
Permitir que backends externos, como `CRM_API_SERVER`, validen acceso contra `subscription-api` sin usar credenciales de administrador.

## Flujo

1. Entrar al admin web.
2. Ir a `Service Tokens`.
3. Crear un token para la aplicacion correspondiente, por ejemplo `CRM`.
4. Copiar el token generado. Solo se muestra una vez.
5. Guardarlo en el `.env` del backend externo.
6. Usarlo como `Authorization: Bearer SERVICE_TOKEN` al llamar `POST /api/v1/entitlements/validate`.

## Seguridad

- En base de datos solo se guarda `token_hash` con SHA-256.
- El valor plano no se puede recuperar despues de crearlo.
- Si se pierde, se debe revocar y crear uno nuevo.
- Los tokens pueden tener expiracion y scopes.

## Scope recomendado

```text
entitlements.validate
```

## Ejemplo de uso en backend externo

```http
POST /api/v1/entitlements/validate
Authorization: Bearer sat_xxxxx
Content-Type: application/json
```

```json
{
  "customerId": "UUID",
  "applicationCode": "CRM",
  "requestedModule": "dashboard"
}
```
