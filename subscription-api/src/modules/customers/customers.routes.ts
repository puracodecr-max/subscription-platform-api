import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { authenticate } from '../../shared/middleware/authenticate';
import { requirePermission } from '../../shared/middleware/requirePermission';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { createCustomerSchema, customerIdParamsSchema, listCustomersQuerySchema, updateCustomerSchema } from './customers.dto';
import * as customersController from './customers.controller';

export const customersRouter = Router();

customersRouter.use(authenticate);
customersRouter.get('/', requirePermission('customers.read'), validateRequest({ query: listCustomersQuerySchema }), asyncHandler(customersController.list));
customersRouter.get('/:id', requirePermission('customers.read'), validateRequest({ params: customerIdParamsSchema }), asyncHandler(customersController.getById));
customersRouter.post('/', requirePermission('customers.write'), validateRequest({ body: createCustomerSchema }), asyncHandler(customersController.create));
customersRouter.patch(
  '/:id',
  requirePermission('customers.write'),
  validateRequest({ params: customerIdParamsSchema, body: updateCustomerSchema }),
  asyncHandler(customersController.update)
);
