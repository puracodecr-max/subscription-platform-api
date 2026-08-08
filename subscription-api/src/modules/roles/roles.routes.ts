import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { authenticate } from '../../shared/middleware/authenticate';
import { requirePermission } from '../../shared/middleware/requirePermission';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { listRolesQuerySchema, roleIdParamsSchema } from './roles.dto';
import * as rolesController from './roles.controller';

export const rolesRouter = Router();

rolesRouter.use(authenticate);
rolesRouter.get('/', requirePermission('security.read'), validateRequest({ query: listRolesQuerySchema }), asyncHandler(rolesController.list));
rolesRouter.get('/:id', requirePermission('security.read'), validateRequest({ params: roleIdParamsSchema }), asyncHandler(rolesController.getById));
rolesRouter.get(
  '/:id/permissions',
  requirePermission('security.read'),
  validateRequest({ params: roleIdParamsSchema }),
  asyncHandler(rolesController.listPermissions)
);
