import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { authenticate } from '../../shared/middleware/authenticate';
import { requirePermission } from '../../shared/middleware/requirePermission';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { createPlanSchema, listPlansQuerySchema, planIdParamsSchema, updatePlanSchema } from './plans.dto';
import * as plansController from './plans.controller';

export const plansRouter = Router();

plansRouter.use(authenticate);
plansRouter.get('/', requirePermission('plans.read'), validateRequest({ query: listPlansQuerySchema }), asyncHandler(plansController.list));
plansRouter.get('/:id', requirePermission('plans.read'), validateRequest({ params: planIdParamsSchema }), asyncHandler(plansController.getById));
plansRouter.post('/', requirePermission('plans.write'), validateRequest({ body: createPlanSchema }), asyncHandler(plansController.create));
plansRouter.patch(
  '/:id',
  requirePermission('plans.write'),
  validateRequest({ params: planIdParamsSchema, body: updatePlanSchema }),
  asyncHandler(plansController.update)
);
