import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { authenticate } from '../../shared/middleware/authenticate';
import { requirePermission } from '../../shared/middleware/requirePermission';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { createPaymentSchema, listPaymentsQuerySchema, paymentActionSchema, paymentIdParamsSchema, rejectPaymentSchema } from './payments.dto';
import * as paymentsController from './payments.controller';

export const paymentsRouter = Router();

paymentsRouter.use(authenticate);
paymentsRouter.get('/', requirePermission('payments.read'), validateRequest({ query: listPaymentsQuerySchema }), asyncHandler(paymentsController.list));
paymentsRouter.get('/:id', requirePermission('payments.read'), validateRequest({ params: paymentIdParamsSchema }), asyncHandler(paymentsController.getById));
paymentsRouter.post('/', requirePermission('payments.write'), validateRequest({ body: createPaymentSchema }), asyncHandler(paymentsController.create));
paymentsRouter.post('/:id/confirm', requirePermission('payments.confirm'), validateRequest({ params: paymentIdParamsSchema }), asyncHandler(paymentsController.confirm));
paymentsRouter.post(
  '/:id/reject',
  requirePermission('payments.reject'),
  validateRequest({ params: paymentIdParamsSchema, body: rejectPaymentSchema }),
  asyncHandler(paymentsController.reject)
);
paymentsRouter.post(
  '/:id/reverse',
  requirePermission('payments.reverse'),
  validateRequest({ params: paymentIdParamsSchema, body: paymentActionSchema }),
  asyncHandler(paymentsController.reverse)
);
