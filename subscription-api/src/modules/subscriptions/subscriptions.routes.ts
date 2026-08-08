import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { authenticate } from '../../shared/middleware/authenticate';
import { requirePermission } from '../../shared/middleware/requirePermission';
import { validateRequest } from '../../shared/middleware/validateRequest';
import {
  cancelSubscriptionSchema,
  changePlanSchema,
  createSubscriptionSchema,
  listSubscriptionsQuerySchema,
  reactivateSubscriptionSchema,
  subscriptionIdParamsSchema,
  suspendSubscriptionSchema,
  updateSubscriptionSchema
} from './subscriptions.dto';
import * as subscriptionsController from './subscriptions.controller';

export const subscriptionsRouter = Router();

subscriptionsRouter.use(authenticate);
subscriptionsRouter.get(
  '/',
  requirePermission('subscriptions.read'),
  validateRequest({ query: listSubscriptionsQuerySchema }),
  asyncHandler(subscriptionsController.list)
);
subscriptionsRouter.get(
  '/:id',
  requirePermission('subscriptions.read'),
  validateRequest({ params: subscriptionIdParamsSchema }),
  asyncHandler(subscriptionsController.getById)
);
subscriptionsRouter.post(
  '/',
  requirePermission('subscriptions.write'),
  validateRequest({ body: createSubscriptionSchema }),
  asyncHandler(subscriptionsController.create)
);
subscriptionsRouter.patch(
  '/:id',
  requirePermission('subscriptions.write'),
  validateRequest({ params: subscriptionIdParamsSchema, body: updateSubscriptionSchema }),
  asyncHandler(subscriptionsController.update)
);
subscriptionsRouter.post(
  '/:id/suspend',
  requirePermission('subscriptions.suspend'),
  validateRequest({ params: subscriptionIdParamsSchema, body: suspendSubscriptionSchema }),
  asyncHandler(subscriptionsController.suspend)
);
subscriptionsRouter.post(
  '/:id/reactivate',
  requirePermission('subscriptions.reactivate'),
  validateRequest({ params: subscriptionIdParamsSchema, body: reactivateSubscriptionSchema }),
  asyncHandler(subscriptionsController.reactivate)
);
subscriptionsRouter.post(
  '/:id/cancel',
  requirePermission('subscriptions.cancel'),
  validateRequest({ params: subscriptionIdParamsSchema, body: cancelSubscriptionSchema }),
  asyncHandler(subscriptionsController.cancel)
);
subscriptionsRouter.post(
  '/:id/change-plan',
  requirePermission('subscriptions.change_plan'),
  validateRequest({ params: subscriptionIdParamsSchema, body: changePlanSchema }),
  asyncHandler(subscriptionsController.changePlan)
);
