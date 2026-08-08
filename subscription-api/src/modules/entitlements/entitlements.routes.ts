import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { authenticateServiceToken } from '../../shared/middleware/authenticateServiceToken';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { validateEntitlementSchema } from './entitlements.dto';
import * as entitlementsController from './entitlements.controller';

export const entitlementsRouter = Router();

entitlementsRouter.post(
  '/validate',
  authenticateServiceToken('entitlements.validate'),
  validateRequest({ body: validateEntitlementSchema }),
  asyncHandler(entitlementsController.validate)
);
