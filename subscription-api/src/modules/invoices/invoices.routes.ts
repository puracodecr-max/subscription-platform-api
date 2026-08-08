import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { authenticate } from '../../shared/middleware/authenticate';
import { requirePermission } from '../../shared/middleware/requirePermission';
import { validateRequest } from '../../shared/middleware/validateRequest';
import {
  adjustmentSchema,
  cancelInvoiceSchema,
  generateInvoiceSchema,
  invoiceIdParamsSchema,
  listInvoicesQuerySchema
} from './invoices.dto';
import * as invoicesController from './invoices.controller';

export const invoicesRouter = Router();

invoicesRouter.use(authenticate);
invoicesRouter.get('/', requirePermission('invoices.read'), validateRequest({ query: listInvoicesQuerySchema }), asyncHandler(invoicesController.list));
invoicesRouter.get('/:id', requirePermission('invoices.read'), validateRequest({ params: invoiceIdParamsSchema }), asyncHandler(invoicesController.getById));
invoicesRouter.post('/generate', requirePermission('invoices.write'), validateRequest({ body: generateInvoiceSchema }), asyncHandler(invoicesController.generate));
invoicesRouter.post(
  '/:id/adjustments',
  requirePermission('invoices.adjust'),
  validateRequest({ params: invoiceIdParamsSchema, body: adjustmentSchema }),
  asyncHandler(invoicesController.addAdjustment)
);
invoicesRouter.post(
  '/:id/cancel',
  requirePermission('invoices.cancel'),
  validateRequest({ params: invoiceIdParamsSchema, body: cancelInvoiceSchema }),
  asyncHandler(invoicesController.cancel)
);
