import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { authenticate } from '../../shared/middleware/authenticate';
import { requirePermission } from '../../shared/middleware/requirePermission';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { applyPenaltySchema, listPenaltiesQuerySchema, listPenaltyRulesQuerySchema, penaltyIdParamsSchema, waivePenaltySchema } from './penalties.dto';
import * as penaltiesController from './penalties.controller';

export const penaltiesRouter = Router();

penaltiesRouter.use(authenticate);
penaltiesRouter.get('/', requirePermission('penalties.read'), validateRequest({ query: listPenaltiesQuerySchema }), asyncHandler(penaltiesController.list));
penaltiesRouter.get('/rules', requirePermission('penalties.read'), validateRequest({ query: listPenaltyRulesQuerySchema }), asyncHandler(penaltiesController.listRules));
penaltiesRouter.get('/:id', requirePermission('penalties.read'), validateRequest({ params: penaltyIdParamsSchema }), asyncHandler(penaltiesController.getById));
penaltiesRouter.post('/apply', requirePermission('penalties.write'), validateRequest({ body: applyPenaltySchema }), asyncHandler(penaltiesController.apply));
penaltiesRouter.post(
  '/:id/waive',
  requirePermission('penalties.waive'),
  validateRequest({ params: penaltyIdParamsSchema, body: waivePenaltySchema }),
  asyncHandler(penaltiesController.waive)
);
