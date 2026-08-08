import { Router } from 'express';
import { applicationsRouter } from '../modules/applications/applications.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { catalogsRouter } from '../modules/catalogs/catalogs.routes';
import { customersRouter } from '../modules/customers/customers.routes';
import { entitlementsRouter } from '../modules/entitlements/entitlements.routes';
import { extensionsRouter } from '../modules/extensions/extensions.routes';
import { invoicesRouter } from '../modules/invoices/invoices.routes';
import { paymentsRouter } from '../modules/payments/payments.routes';
import { penaltiesRouter } from '../modules/penalties/penalties.routes';
import { plansRouter } from '../modules/plans/plans.routes';
import { rolesRouter } from '../modules/roles/roles.routes';
import { serviceTokensRouter } from '../modules/serviceTokens/serviceTokens.routes';
import { subscriptionsRouter } from '../modules/subscriptions/subscriptions.routes';
import { sendSuccess } from '../shared/http/apiResponse';

export const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
  return sendSuccess(res, { name: 'subscription-api', version: '0.1.0' }, 'Subscription API');
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/catalogs', catalogsRouter);
apiRouter.use('/roles', rolesRouter);
apiRouter.use('/service-tokens', serviceTokensRouter);
apiRouter.use('/customers', customersRouter);
apiRouter.use('/applications', applicationsRouter);
apiRouter.use('/plans', plansRouter);
apiRouter.use('/subscriptions', subscriptionsRouter);
apiRouter.use('/invoices', invoicesRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/penalties', penaltiesRouter);
apiRouter.use('/extensions', extensionsRouter);
apiRouter.use('/entitlements', entitlementsRouter);
