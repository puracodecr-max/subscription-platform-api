import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { authenticate } from '../../shared/middleware/authenticate';
import { requirePermission } from '../../shared/middleware/requirePermission';
import * as catalogsController from './catalogs.controller';

export const catalogsRouter = Router();

catalogsRouter.use(authenticate);
catalogsRouter.get('/currencies', requirePermission('plans.read'), asyncHandler(catalogsController.listCurrencies));
catalogsRouter.get('/payment-methods', requirePermission('payments.read'), asyncHandler(catalogsController.listPaymentMethods));
