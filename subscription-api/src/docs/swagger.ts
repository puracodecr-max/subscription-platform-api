import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../config/env';

const bearerSecurity = [{ bearerAuth: [] }];
const serviceTokenSecurity = [{ serviceTokenAuth: [] }];

const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' }
};

const paginationParameters = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } }
];

function jsonBody(example: Record<string, unknown>) {
  return {
    required: true,
    content: {
      'application/json': {
        schema: { type: 'object' },
        example
      }
    }
  };
}

function success(description = 'Operacion realizada correctamente') {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiSuccess' }
      }
    }
  };
}

const errorResponses = {
  400: { $ref: '#/components/responses/BadRequest' },
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' },
  404: { $ref: '#/components/responses/NotFound' },
  409: { $ref: '#/components/responses/Conflict' }
};

export const specs = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Subscription API',
      version: '0.1.0',
      description: 'Centralized subscription platform API'
    },
    servers: [
      {
        url: env.SWAGGER_SERVER_URL ?? `http://localhost:${env.PORT}`
      }
    ],
    tags: [
      { name: 'Auth' },
      { name: 'Catalogs' },
      { name: 'Roles' },
      { name: 'Customers' },
      { name: 'Applications' },
      { name: 'Plans' },
      { name: 'Subscriptions' },
      { name: 'Invoices' },
      { name: 'Payments' },
      { name: 'Penalties' },
      { name: 'Extensions' },
      { name: 'Entitlements' },
      { name: 'Service Tokens' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT administrativo obtenido con /api/v1/auth/login'
        },
        serviceTokenAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Service token generado en /api/v1/service-tokens'
        }
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { nullable: true },
            message: { type: 'string', example: 'Operacion realizada correctamente' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 100 },
                totalPages: { type: 'integer', example: 5 }
              }
            }
          }
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Datos invalidos' },
                details: { nullable: true }
              }
            }
          }
        }
      },
      responses: {
        BadRequest: { description: 'Solicitud invalida', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        Unauthorized: { description: 'No autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        Forbidden: { description: 'Permiso insuficiente', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        NotFound: { description: 'Recurso no encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        Conflict: { description: 'Conflicto de negocio', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } }
      }
    },
    paths: {
      '/api/v1/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Iniciar sesion administrativa',
          requestBody: jsonBody({ username: 'admin@subscription.local', password: 'password' }),
          responses: { 200: success('Sesion iniciada correctamente'), 401: errorResponses[401] }
        }
      },
      '/api/v1/auth/logout': {
        post: { tags: ['Auth'], summary: 'Cerrar sesion', security: bearerSecurity, responses: { 200: success(), 401: errorResponses[401] } }
      },
      '/api/v1/auth/me': {
        get: { tags: ['Auth'], summary: 'Obtener usuario autenticado', security: bearerSecurity, responses: { 200: success(), 401: errorResponses[401] } }
      },
      '/api/v1/catalogs/currencies': {
        get: { tags: ['Catalogs'], summary: 'Listar monedas activas', security: bearerSecurity, responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/catalogs/payment-methods': {
        get: { tags: ['Catalogs'], summary: 'Listar metodos de pago activos', security: bearerSecurity, responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/roles': {
        get: { tags: ['Roles'], summary: 'Listar roles', security: bearerSecurity, parameters: paginationParameters, responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/roles/{id}': {
        get: { tags: ['Roles'], summary: 'Obtener rol por ID', security: bearerSecurity, parameters: [idParameter], responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/roles/{id}/permissions': {
        get: { tags: ['Roles'], summary: 'Listar permisos de un rol', security: bearerSecurity, parameters: [idParameter], responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/customers': {
        get: {
          tags: ['Customers'],
          summary: 'Listar clientes',
          security: bearerSecurity,
          parameters: [...paginationParameters, { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'] } }, { name: 'search', in: 'query', schema: { type: 'string' } }],
          responses: { 200: success(), ...errorResponses }
        },
        post: {
          tags: ['Customers'],
          summary: 'Crear cliente',
          security: bearerSecurity,
          requestBody: jsonBody({ legalName: 'Hotel Demo S.A.', displayName: 'Hotel Demo', email: 'admin@hotel.test', status: 'ACTIVE' }),
          responses: { 201: success('Cliente creado correctamente'), ...errorResponses }
        }
      },
      '/api/v1/customers/{id}': {
        get: { tags: ['Customers'], summary: 'Obtener cliente por ID', security: bearerSecurity, parameters: [idParameter], responses: { 200: success(), ...errorResponses } },
        patch: { tags: ['Customers'], summary: 'Actualizar cliente', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ displayName: 'Hotel Demo Updated' }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/applications': {
        get: { tags: ['Applications'], summary: 'Listar aplicaciones', security: bearerSecurity, parameters: paginationParameters, responses: { 200: success(), ...errorResponses } },
        post: { tags: ['Applications'], summary: 'Crear aplicacion', security: bearerSecurity, requestBody: jsonBody({ code: 'CRM', name: 'CRM', modules: [{ code: 'dashboard', name: 'Dashboard' }] }), responses: { 201: success('Aplicacion creada correctamente'), ...errorResponses } }
      },
      '/api/v1/applications/{id}': {
        get: { tags: ['Applications'], summary: 'Obtener aplicacion por ID', security: bearerSecurity, parameters: [idParameter], responses: { 200: success(), ...errorResponses } },
        patch: { tags: ['Applications'], summary: 'Actualizar aplicacion', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ name: 'CRM Updated' }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/plans': {
        get: { tags: ['Plans'], summary: 'Listar planes', security: bearerSecurity, parameters: paginationParameters, responses: { 200: success(), ...errorResponses } },
        post: { tags: ['Plans'], summary: 'Crear plan', security: bearerSecurity, requestBody: jsonBody({ applicationId: '00000000-0000-0000-0000-000000000000', code: 'CRM_PRO', name: 'CRM Pro', price: '100.00', currencyId: '00000000-0000-0000-0000-000000000000', frequency: 'MONTHLY' }), responses: { 201: success('Plan creado correctamente'), ...errorResponses } }
      },
      '/api/v1/plans/{id}': {
        get: { tags: ['Plans'], summary: 'Obtener plan por ID', security: bearerSecurity, parameters: [idParameter], responses: { 200: success(), ...errorResponses } },
        patch: { tags: ['Plans'], summary: 'Actualizar plan', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ price: '120.00' }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/subscriptions': {
        get: { tags: ['Subscriptions'], summary: 'Listar suscripciones', security: bearerSecurity, parameters: paginationParameters, responses: { 200: success(), ...errorResponses } },
        post: { tags: ['Subscriptions'], summary: 'Crear suscripcion', security: bearerSecurity, requestBody: jsonBody({ customerId: '00000000-0000-0000-0000-000000000000', applicationId: '00000000-0000-0000-0000-000000000000', planId: '00000000-0000-0000-0000-000000000000', startDate: '2026-08-01', nextBillingDate: '2026-09-01', billingDay: 1, status: 'ACTIVE' }), responses: { 201: success('Suscripcion creada correctamente'), ...errorResponses } }
      },
      '/api/v1/subscriptions/{id}': {
        get: { tags: ['Subscriptions'], summary: 'Obtener suscripcion por ID', security: bearerSecurity, parameters: [idParameter], responses: { 200: success(), ...errorResponses } },
        patch: { tags: ['Subscriptions'], summary: 'Actualizar suscripcion', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ nextBillingDate: '2026-10-01' }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/subscriptions/{id}/suspend': {
        post: { tags: ['Subscriptions'], summary: 'Suspender suscripcion', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ suspensionType: 'ADMINISTRATIVE', reason: 'Suspension manual' }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/subscriptions/{id}/reactivate': {
        post: { tags: ['Subscriptions'], summary: 'Reactivar suscripcion', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ reason: 'Pago recibido', forceAdministrative: true }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/subscriptions/{id}/cancel': {
        post: { tags: ['Subscriptions'], summary: 'Cancelar suscripcion', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ reason: 'Cancelacion solicitada' }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/subscriptions/{id}/change-plan': {
        post: { tags: ['Subscriptions'], summary: 'Cambiar plan', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ newPlanId: '00000000-0000-0000-0000-000000000000', effectiveDate: '2026-09-01', approveImmediately: true }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/invoices': {
        get: { tags: ['Invoices'], summary: 'Listar facturas', security: bearerSecurity, parameters: paginationParameters, responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/invoices/{id}': {
        get: { tags: ['Invoices'], summary: 'Obtener factura por ID', security: bearerSecurity, parameters: [idParameter], responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/invoices/generate': {
        post: { tags: ['Invoices'], summary: 'Generar factura', security: bearerSecurity, requestBody: jsonBody({ subscriptionId: '00000000-0000-0000-0000-000000000000', billingPeriodStart: '2026-08-01', billingPeriodEnd: '2026-08-31', issueDate: '2026-08-01', dueDate: '2026-08-10' }), responses: { 201: success('Factura generada correctamente'), ...errorResponses } }
      },
      '/api/v1/invoices/{id}/adjustments': {
        post: { tags: ['Invoices'], summary: 'Aplicar ajuste a factura', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ type: 'CHARGE', description: 'Ajuste manual', amount: '10.00' }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/invoices/{id}/cancel': {
        post: { tags: ['Invoices'], summary: 'Cancelar factura', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ reason: 'Factura emitida por error' }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/payments': {
        get: { tags: ['Payments'], summary: 'Listar pagos', security: bearerSecurity, parameters: paginationParameters, responses: { 200: success(), ...errorResponses } },
        post: { tags: ['Payments'], summary: 'Registrar pago', security: bearerSecurity, requestBody: jsonBody({ customerId: '00000000-0000-0000-0000-000000000000', currencyId: '00000000-0000-0000-0000-000000000000', amount: '100.00', notes: 'Transferencia bancaria' }), responses: { 201: success('Pago registrado correctamente'), ...errorResponses } }
      },
      '/api/v1/payments/{id}': {
        get: { tags: ['Payments'], summary: 'Obtener pago por ID', security: bearerSecurity, parameters: [idParameter], responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/payments/{id}/confirm': {
        post: { tags: ['Payments'], summary: 'Confirmar pago', security: bearerSecurity, parameters: [idParameter], responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/payments/{id}/reject': {
        post: { tags: ['Payments'], summary: 'Rechazar pago', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ reason: 'Referencia no encontrada' }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/payments/{id}/reverse': {
        post: { tags: ['Payments'], summary: 'Reversar pago', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ reason: 'Pago devuelto' }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/penalties': {
        get: { tags: ['Penalties'], summary: 'Listar multas', security: bearerSecurity, parameters: paginationParameters, responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/penalties/rules': {
        get: { tags: ['Penalties'], summary: 'Listar reglas de multa', security: bearerSecurity, parameters: paginationParameters, responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/penalties/{id}': {
        get: { tags: ['Penalties'], summary: 'Obtener multa por ID', security: bearerSecurity, parameters: [idParameter], responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/penalties/apply': {
        post: { tags: ['Penalties'], summary: 'Aplicar multa', security: bearerSecurity, requestBody: jsonBody({ invoiceId: '00000000-0000-0000-0000-000000000000', penaltyRuleId: '00000000-0000-0000-0000-000000000000', reason: 'Factura vencida' }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/penalties/{id}/waive': {
        post: { tags: ['Penalties'], summary: 'Condonar multa', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ reason: 'Condonacion autorizada' }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/extensions': {
        get: { tags: ['Extensions'], summary: 'Listar prorrogas', security: bearerSecurity, parameters: paginationParameters, responses: { 200: success(), ...errorResponses } },
        post: { tags: ['Extensions'], summary: 'Crear prorroga', security: bearerSecurity, requestBody: jsonBody({ subscriptionId: '00000000-0000-0000-0000-000000000000', originalDueDate: '2026-08-10', extendedDueDate: '2026-08-20', reason: 'Prorroga comercial' }), responses: { 201: success('Prorroga creada correctamente'), ...errorResponses } }
      },
      '/api/v1/extensions/{id}': {
        get: { tags: ['Extensions'], summary: 'Obtener prorroga por ID', security: bearerSecurity, parameters: [idParameter], responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/extensions/{id}/cancel': {
        post: { tags: ['Extensions'], summary: 'Cancelar prorroga', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ reason: 'Prorroga revocada' }), responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/entitlements/validate': {
        post: {
          tags: ['Entitlements'],
          summary: 'Validar acceso de cliente a aplicacion/modulo',
          security: serviceTokenSecurity,
          requestBody: jsonBody({ customerId: '00000000-0000-0000-0000-000000000000', applicationCode: 'CRM', requestedModule: 'dashboard' }),
          responses: { 200: success('Resultado de validacion de acceso'), 401: errorResponses[401], 403: errorResponses[403] }
        }
      },
      '/api/v1/service-tokens': {
        get: { tags: ['Service Tokens'], summary: 'Listar service tokens', security: bearerSecurity, parameters: paginationParameters, responses: { 200: success(), ...errorResponses } },
        post: { tags: ['Service Tokens'], summary: 'Crear service token', security: bearerSecurity, requestBody: jsonBody({ applicationId: '00000000-0000-0000-0000-000000000000', name: 'CRM production token', scopes: ['entitlements.validate'] }), responses: { 201: success('Token creado. El valor plano solo se muestra una vez.'), ...errorResponses } }
      },
      '/api/v1/service-tokens/{id}': {
        get: { tags: ['Service Tokens'], summary: 'Obtener service token por ID', security: bearerSecurity, parameters: [idParameter], responses: { 200: success(), ...errorResponses } }
      },
      '/api/v1/service-tokens/{id}/revoke': {
        post: { tags: ['Service Tokens'], summary: 'Revocar service token', security: bearerSecurity, parameters: [idParameter], requestBody: jsonBody({ reason: 'Rotacion de credenciales' }), responses: { 200: success(), ...errorResponses } }
      }
    }
  },
  apis: []
});
