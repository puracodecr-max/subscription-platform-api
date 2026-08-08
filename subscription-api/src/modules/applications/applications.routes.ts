import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { authenticate } from '../../shared/middleware/authenticate';
import { requirePermission } from '../../shared/middleware/requirePermission';
import { validateRequest } from '../../shared/middleware/validateRequest';
import {
  applicationIdParamsSchema,
  createApplicationSchema,
  listApplicationsQuerySchema,
  updateApplicationSchema
} from './applications.dto';
import * as applicationsController from './applications.controller';

export const applicationsRouter = Router();

applicationsRouter.use(authenticate);
applicationsRouter.get(
  '/',
  requirePermission('applications.read'),
  validateRequest({ query: listApplicationsQuerySchema }),
  asyncHandler(applicationsController.list)
);
applicationsRouter.get(
  '/:id',
  requirePermission('applications.read'),
  validateRequest({ params: applicationIdParamsSchema }),
  asyncHandler(applicationsController.getById)
);
applicationsRouter.post(
  '/',
  requirePermission('applications.write'),
  validateRequest({ body: createApplicationSchema }),
  asyncHandler(applicationsController.create)
);
applicationsRouter.patch(
  '/:id',
  requirePermission('applications.write'),
  validateRequest({ params: applicationIdParamsSchema, body: updateApplicationSchema }),
  asyncHandler(applicationsController.update)
);
