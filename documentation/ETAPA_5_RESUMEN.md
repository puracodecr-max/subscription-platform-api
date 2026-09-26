# ETAPA 5 - Multas, prorrogas y reactivacion financiera

## ETAPA ACTUAL
Etapa 5: multas, prorrogas y reactivacion financiera.

## Objetivo de la etapa
Agregar endpoints administrativos para consultar reglas de multa, aplicar multas, condonar multas, crear prorrogas, cancelar prorrogas y exponer estas operaciones con permisos atomicos y respuestas uniformes.

## Analisis realizado

- Se reutilizo la estructura `routes -> controller -> service -> repository`.
- Se usaron las tablas `adm.penalty_rules`, `adm.penalties` y `adm.subscription_extensions` creadas en la Etapa 2.
- Se integraron las funciones SQL `adm.apply_penalty` y `adm.waive_penalty`.
- La creacion de prorrogas se implemento en transaccion desde la API porque no existe una funcion SQL dedicada.
- Las suscripciones ya contaban con endpoints de suspension y reactivacion usando `adm.suspend_subscription` y `adm.reactivate_subscription`.

## Decisiones tecnicas

- Aplicar multa delega calculo, restriccion de duplicados, saldo base y auditoria en `adm.apply_penalty`.
- Condonar multa delega actualizacion de factura, saldo y auditoria en `adm.waive_penalty`.
- Crear una prorroga no modifica la fecha original de la factura; registra `original_due_date` y `extended_due_date`.
- Si se crea una prorroga con `invoiceId`, la API toma `originalDueDate` desde la factura y valida que pertenezca a la suscripcion indicada.
- `reactivateIfEligible` permite intentar reactivacion financiera al crear la prorroga; si la funcion SQL detecta otra deuda bloqueante, la operacion falla y no persiste la prorroga.
- Cancelar una prorroga solo se permite si esta activa.

## Endpoints agregados

- `GET /api/v1/penalties`
- `GET /api/v1/penalties/:id`
- `GET /api/v1/penalties/rules`
- `POST /api/v1/penalties/apply`
- `POST /api/v1/penalties/:id/waive`
- `GET /api/v1/extensions`
- `GET /api/v1/extensions/:id`
- `POST /api/v1/extensions`
- `POST /api/v1/extensions/:id/cancel`

## Permisos usados

- `penalties.read`
- `penalties.write`
- `penalties.waive`
- `extensions.read`
- `extensions.write`
- `subscriptions.suspend`
- `subscriptions.reactivate`

## Archivos creados

- `C:\Sistema administrador\subscription-platform\subscription-api\src\modules\penalties\penalties.types.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\modules\penalties\penalties.dto.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\modules\penalties\penalties.repository.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\modules\penalties\penalties.service.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\modules\penalties\penalties.controller.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\modules\penalties\penalties.routes.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\modules\extensions\extensions.types.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\modules\extensions\extensions.dto.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\modules\extensions\extensions.repository.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\modules\extensions\extensions.service.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\modules\extensions\extensions.controller.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\modules\extensions\extensions.routes.ts`
- `C:\Sistema administrador\subscription-platform\documentation\ETAPA_5_RESUMEN.md`

## Archivos modificados

- `C:\Sistema administrador\subscription-platform\subscription-api\src\routes\index.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\errors\databaseError.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\errors\errorCodes.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\src\shared\validation\commonSchemas.ts`
- `C:\Sistema administrador\subscription-platform\subscription-api\README.md`
- `C:\Sistema administrador\subscription-platform\documentation\API.md`

## Codigo
Se creo codigo TypeScript ejecutable para los modulos `penalties` y `extensions`.

## Migraciones o comandos

No se crearon migraciones nuevas en esta etapa. Se usaron tablas y funciones existentes de `subscription-database`.

Comandos ejecutados:

```powershell
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

## Como probar

Desde `C:\Sistema administrador\subscription-platform\subscription-api`:

```powershell
npm run dev
```

Luego autenticar un usuario con permisos administrativos y probar:

```text
GET /api/v1/penalties?limit=1
GET /api/v1/penalties/rules?limit=1
GET /api/v1/extensions?limit=1
```

## Pruebas realizadas

- `npm run typecheck`: TypeScript estricto sin errores.
- `npm run build`: compilacion completa sin errores.
- `npm audit --audit-level=moderate`: 0 vulnerabilidades reportadas.
- Verificacion real autenticada: `GET /api/v1/penalties?limit=1` respondio correctamente con paginacion.
- Verificacion real autenticada: `GET /api/v1/penalties/rules?limit=1` respondio correctamente con paginacion.
- Verificacion real autenticada: `GET /api/v1/extensions?limit=1` respondio correctamente con paginacion.

## Riesgos o pendientes

- No se ejecutaron pruebas de escritura contra la base real porque no se insertaron facturas, multas ni prorrogas persistentes de prueba sin confirmacion.
- Automatizacion diaria de vencimientos, multas, suspension financiera y expiracion de prorrogas queda para una etapa de workers.
- Validacion de acceso para aplicaciones, notificaciones, auditoria consultable y dashboard quedan para etapas posteriores.

## Resumen final
La Etapa 5 agrega gestion de multas y prorrogas al backend, integrando reglas financieras, condonaciones, extensiones de vencimiento y errores de negocio claros.

Etapa finalizada. No continuare con la siguiente etapa hasta recibir la instruccion de continuar.
