import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { authenticate } from '../../shared/middleware/authenticate';
import { requirePermission } from '../../shared/middleware/requirePermission';
import { validateRequest } from '../../shared/middleware/validateRequest';
import {
  createServiceTokenSchema,
  listServiceTokensQuerySchema,
  revokeServiceTokenSchema,
  serviceTokenIdParamsSchema
} from './serviceTokens.dto';
import * as serviceTokensController from './serviceTokens.controller';

export const serviceTokensRouter = Router();

serviceTokensRouter.use(authenticate);
serviceTokensRouter.get(
  '/',
  requirePermission('security.read'),
  validateRequest({ query: listServiceTokensQuerySchema }),
  asyncHandler(serviceTokensController.list)
);
serviceTokensRouter.get(
  '/:id',
  requirePermission('security.read'),
  validateRequest({ params: serviceTokenIdParamsSchema }),
  asyncHandler(serviceTokensController.getById)
);
serviceTokensRouter.post(
  '/',
  requirePermission('security.write'),
  validateRequest({ body: createServiceTokenSchema }),
  asyncHandler(serviceTokensController.create)
);
serviceTokensRouter.post(
  '/:id/revoke',
  requirePermission('security.write'),
  validateRequest({ params: serviceTokenIdParamsSchema, body: revokeServiceTokenSchema }),
  asyncHandler(serviceTokensController.revoke)
);
