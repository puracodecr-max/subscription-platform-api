import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { authenticate } from '../../shared/middleware/authenticate';
import { requirePermission } from '../../shared/middleware/requirePermission';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { cancelExtensionSchema, createExtensionSchema, extensionIdParamsSchema, listExtensionsQuerySchema } from './extensions.dto';
import * as extensionsController from './extensions.controller';

export const extensionsRouter = Router();

extensionsRouter.use(authenticate);
extensionsRouter.get('/', requirePermission('extensions.read'), validateRequest({ query: listExtensionsQuerySchema }), asyncHandler(extensionsController.list));
extensionsRouter.get('/:id', requirePermission('extensions.read'), validateRequest({ params: extensionIdParamsSchema }), asyncHandler(extensionsController.getById));
extensionsRouter.post('/', requirePermission('extensions.write'), validateRequest({ body: createExtensionSchema }), asyncHandler(extensionsController.create));
extensionsRouter.post(
  '/:id/cancel',
  requirePermission('extensions.write'),
  validateRequest({ params: extensionIdParamsSchema, body: cancelExtensionSchema }),
  asyncHandler(extensionsController.cancel)
);
