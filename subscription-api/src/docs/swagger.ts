import path from 'node:path';
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../config/env';

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
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [path.join(__dirname, '../modules/**/*.routes.{ts,js}')]
});
