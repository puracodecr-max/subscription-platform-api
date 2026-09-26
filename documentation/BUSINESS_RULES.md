# Business Rules

## Objetivo
Centralizar las reglas de suscripciones, facturacion, pagos, multas, suspension, reactivacion y validacion de acceso.

## Entidades principales

- Customer: persona o empresa que contrata una o varias aplicaciones.
- Application: sistema ofrecido con codigo unico.
- Plan: condiciones comerciales de una aplicacion.
- Subscription: contratacion de una aplicacion por un cliente.
- Invoice: obligacion de pago de un periodo.
- InvoiceItem: detalle de una factura.
- Payment: movimiento financiero.
- PaymentAllocation: aplicacion de un pago a una o varias facturas.
- PenaltyRule: regla de multa.
- Penalty: multa aplicada a una factura.
- SubscriptionExtension: prorroga autorizada.
- Notification: evento de comunicacion.
- AuditLog: registro de accion y cambios.

## Estados de suscripcion

Estados permitidos:

- `TRIAL`
- `ACTIVE`
- `GRACE_PERIOD`
- `OVERDUE`
- `SUSPENDED`
- `CANCELLED`
- `EXPIRED`

Transiciones validas iniciales:

| From | To | Motivo permitido |
| --- | --- | --- |
| `TRIAL` | `ACTIVE` | Conversion de prueba a pago |
| `TRIAL` | `CANCELLED` | Cancelacion durante prueba |
| `TRIAL` | `EXPIRED` | Prueba vencida sin activacion |
| `ACTIVE` | `GRACE_PERIOD` | Factura vencida dentro de gracia |
| `ACTIVE` | `SUSPENDED` | Suspension administrativa |
| `ACTIVE` | `CANCELLED` | Cancelacion autorizada |
| `ACTIVE` | `EXPIRED` | Fin de vigencia sin renovacion |
| `GRACE_PERIOD` | `ACTIVE` | Pago confirmado o ajuste deja deuda bloqueante en cero |
| `GRACE_PERIOD` | `OVERDUE` | Fin del periodo de gracia con saldo pendiente |
| `GRACE_PERIOD` | `SUSPENDED` | Suspension administrativa |
| `GRACE_PERIOD` | `CANCELLED` | Cancelacion autorizada |
| `OVERDUE` | `ACTIVE` | Pago confirmado elimina deuda bloqueante |
| `OVERDUE` | `SUSPENDED` | Dias para suspension alcanzados |
| `OVERDUE` | `CANCELLED` | Cancelacion autorizada |
| `SUSPENDED` | `ACTIVE` | Reactivacion financiera o manual permitida |
| `SUSPENDED` | `CANCELLED` | Cancelacion autorizada |

Estados terminales:

- `CANCELLED`
- `EXPIRED`

Una suscripcion cancelada o expirada no se reactiva automaticamente.

## Reglas de suscripcion

- Un cliente puede contratar varias aplicaciones.
- Un cliente no puede tener dos suscripciones activas para la misma aplicacion, salvo que se implemente sede, sucursal o tenant secundario.
- Cada suscripcion se gestiona de forma independiente.
- La deuda de una aplicacion no suspende automaticamente las demas.
- Debe existir suspension global manual para razones administrativas.
- Una suspension no elimina informacion.
- Una cancelacion no elimina historial.
- No se eliminan fisicamente suscripciones con movimientos financieros.

## Estados de factura

Estados iniciales propuestos:

- `ISSUED`: factura emitida y pendiente.
- `PARTIALLY_PAID`: factura con pago parcial confirmado.
- `PAID`: factura con saldo cero.
- `OVERDUE`: factura vencida con saldo pendiente.
- `CANCELLED`: factura anulada de forma controlada.

## Reglas de facturacion

- La facturacion inicial es anticipada.
- La frecuencia principal es mensual.
- La factura se genera 7 dias antes del inicio o vencimiento del siguiente periodo.
- La fecha de vencimiento pertenece a la factura.
- Cada factura indica periodo facturado.
- Una factura emitida conserva precio, moneda, plan, descuento, multa, impuestos, total y saldo aunque cambie el plan.
- Los cambios de plan aplican en el siguiente ciclo.
- No se implementa prorrateo inicial.
- Si el dia de cobro es 29, 30 o 31 y el mes no lo contiene, se usa el ultimo dia del mes.
- No se genera mas de una factura para la misma suscripcion y periodo.
- La restriccion unica requerida es `subscription_id`, `billing_period_start`, `billing_period_end`.

## Periodo de gracia

- Valor inicial recomendado: 5 dias naturales.
- El valor debe ser configurable por plan o suscripcion.
- Durante la gracia la aplicacion continua funcionando.
- Durante la gracia se debe mostrar advertencia.
- La suscripcion cambia a `GRACE_PERIOD`.
- No se suspende durante la gracia por deuda financiera.
- La multa se aplica al finalizar la gracia si existe saldo base pendiente.

## Multas

Configuracion inicial:

- Tipo: porcentaje.
- Valor: 5 por ciento del saldo base pendiente.
- Aplicacion: una vez por factura.

Reglas:

- No aplicar multa a facturas pagadas.
- No aplicar multa a facturas canceladas.
- No aplicar multa duplicada.
- No aplicar multa sobre multas.
- Calcular sobre saldo base pendiente.
- Permitir multa fija, porcentual o escalonada.
- Permitir condonacion con motivo y usuario autorizador.
- Conservar multas condonadas en historial.
- No eliminar multas fisicamente.
- Toda multa indica la regla que la genero.

Estados de multa:

- `APPLIED`
- `WAIVED`
- `CANCELLED`

## Suspension

Configuracion inicial:

- Suspension financiera 10 dias despues del vencimiento.

Condiciones para suspension financiera:

- Existe saldo pendiente.
- La factura supero el periodo de gracia.
- Se alcanzaron los dias configurados para suspension.
- No existe prorroga vigente.

Tipos de suspension:

- `FINANCIAL`: puede levantarse automaticamente cuando se elimina la deuda bloqueante.
- `ADMINISTRATIVE`: requiere intervencion manual.

## Reactivacion

Una suscripcion puede reactivarse automaticamente si:

- El pago esta confirmado.
- La deuda bloqueante queda en cero.
- No existen otras facturas vencidas bloqueantes.
- No existe suspension administrativa.
- La suscripcion no esta cancelada.
- La suscripcion no esta expirada.

Un pago parcial no reactiva si todavia queda deuda bloqueante.

## Pagos

Estados de pago:

- `PENDING`
- `CONFIRMED`
- `REJECTED`
- `REVERSED`

Reglas:

- Un pago pendiente no modifica facturas.
- Solo un pago confirmado afecta saldos.
- Un pago confirmado no se modifica ni elimina.
- Para corregir un pago confirmado se crea una reversa.
- Un pago puede distribuirse entre varias facturas.
- Una factura puede recibir varios pagos.
- Se permiten pagos parciales.
- Se debe impedir aplicacion duplicada del mismo pago.
- Debe existir identificador externo o clave de idempotencia.
- Confirmacion y reversa deben ser transaccionales.

Orden inicial de aplicacion:

1. Factura vencida mas antigua.
2. Monto base pendiente.
3. Impuestos, si aplican.
4. Multas.
5. Facturas mas recientes.

## Cambios de plan

- Aplican en el siguiente periodo.
- No modifican facturas ya emitidas.
- Conservan plan anterior en historial.
- Registran solicitante, aprobador y fecha efectiva.

## Cancelaciones

Tipos:

- Inmediata.
- Al finalizar periodo actual.

Reglas:

- Cancelar no elimina facturas pendientes.
- Cancelar no elimina pagos.
- Cancelar no elimina datos.
- No se generan nuevas facturas despues de la fecha efectiva.
- Se guarda motivo, usuario responsable, fecha de solicitud y fecha efectiva.

## Prorrogas

Una prorroga registra:

- Fecha original.
- Nueva fecha.
- Motivo.
- Usuario autorizador.
- Fecha de autorizacion.

La fecha original no debe modificarse silenciosamente.

## Auditoria obligatoria

Registrar como minimo:

- Usuario.
- Accion.
- Entidad.
- Identificador.
- Valores anteriores.
- Valores nuevos.
- Fecha.
- Direccion IP.
- Motivo.
- Origen de operacion.

Acciones criticas:

- Registrar pago.
- Confirmar pago.
- Reversar pago.
- Cambiar vencimiento.
- Aplicar multa.
- Condonar multa.
- Suspender.
- Reactivar.
- Cancelar.
- Cambiar plan.
- Modificar precio.
- Aplicar prorroga.
