# Security

## Objetivo
Definir reglas de seguridad para usuarios administrativos, aplicaciones consumidoras, base de datos y operaciones financieras.

## Reglas generales

- La clave `service_role` de Supabase nunca debe estar en React.
- React solo usa credenciales publicas permitidas.
- Las operaciones financieras se ejecutan en backend.
- No confiar en identificadores enviados libremente por frontend.
- Validar autenticacion y autorizacion en backend.
- Proteger endpoints administrativos.
- Implementar rate limiting.
- Validar y sanitizar entradas.
- No retornar secretos ni detalles internos en errores.
- Registrar intentos de acceso no autorizado.
- Validar firmas de webhooks cuando existan.
- Usar idempotencia para operaciones criticas.

## Autenticacion administrativa

Recomendacion inicial:

- JWT de corta duracion para usuarios administrativos.
- `JWT_SECRET` obligatorio, sin valor por defecto.
- Hash de contrasenas con `argon2id` o `bcrypt`.
- Nunca cifrar contrasenas de forma reversible.
- Nunca registrar contrasenas ni tokens completos en logs.

## Autorizacion

Roles iniciales:

- `SUPER_ADMIN`
- `BILLING_ADMIN`
- `SUPPORT_AGENT`
- `VIEWER`
- `APPLICATION_SERVICE`
- `CUSTOMER_ADMIN`

El backend debe validar permisos por accion y entidad.

El frontend puede ocultar botones, pero eso no reemplaza la autorizacion en API.

## Tokens de servicio

Uso:

- Integracion de aplicaciones existentes con `POST /api/v1/entitlements/validate`.

Reglas:

- Guardar tokens hasheados en base de datos.
- Mostrar el valor plano solo al crearlo.
- Permitir revocacion.
- Permitir expiracion.
- Asociar token con aplicacion, alcance y ambiente.
- Registrar ultimo uso y origen.

## Seguridad de base de datos

- Usar esquema `adm`.
- Habilitar RLS en tablas expuestas.
- Crear politicas por rol cuando aplique.
- Usar transacciones para operaciones financieras.
- Crear restricciones de integridad para reglas criticas.
- Evitar operaciones directas desde React contra tablas financieras.

## CORS

- Configurar origenes permitidos por ambiente.
- No usar CORS abierto en produccion.
- No duplicar middleware CORS.

## Rate limiting

Endpoints sensibles:

- Login.
- Validacion de entitlements.
- Confirmacion de pagos.
- Webhooks.

## Logs y auditoria

Los logs tecnicos no deben contener:

- Contrasenas.
- Tokens completos.
- Claves privadas.
- `DATABASE_URL` completo.
- Datos financieros sensibles innecesarios.

Audit logs deben registrar acciones criticas con usuario, entidad, cambios, IP, motivo y origen.

## Politica ante caida del servicio central

- Operaciones no sensibles pueden usar ultimo resultado valido por un tiempo corto.
- Operaciones sensibles deben bloquearse si no se puede validar despues del limite permitido.
- Nunca permitir acceso indefinido con autorizacion antigua.
