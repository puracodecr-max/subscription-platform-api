import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/http/apiResponse';
import { parsePagination } from '../../shared/http/pagination';
import { getAuthenticatedUserId, getRequiredParam } from '../../shared/http/requestContext';
import type {
  CancelSubscriptionInput,
  ChangePlanInput,
  CreateSubscriptionInput,
  ListSubscriptionsQuery,
  ReactivateSubscriptionInput,
  SuspendSubscriptionInput,
  UpdateSubscriptionInput
} from './subscriptions.dto';
import * as subscriptionsService from './subscriptions.service';

export async function list(req: Request, res: Response) {
  const query = req.query as ListSubscriptionsQuery;
  const paginationInput = parsePagination(query);
  const result = await subscriptionsService.listSubscriptions({
    ...paginationInput,
    customerId: query.customerId,
    applicationId: query.applicationId,
    status: query.status
  });
  return sendSuccess(res, result.items, 'Suscripciones obtenidas correctamente', 200, result.pagination);
}

export async function getById(req: Request, res: Response) {
  const subscription = await subscriptionsService.getSubscriptionById(getRequiredParam(req, 'id'));
  return sendSuccess(res, subscription, 'Suscripcion obtenida correctamente');
}

export async function create(req: Request, res: Response) {
  const subscription = await subscriptionsService.createSubscription(req.body as CreateSubscriptionInput, getAuthenticatedUserId(req));
  return sendSuccess(res, subscription, 'Suscripcion creada correctamente', 201);
}

export async function update(req: Request, res: Response) {
  const subscription = await subscriptionsService.updateSubscription(getRequiredParam(req, 'id'), req.body as UpdateSubscriptionInput, getAuthenticatedUserId(req));
  return sendSuccess(res, subscription, 'Suscripcion actualizada correctamente');
}

export async function suspend(req: Request, res: Response) {
  const subscription = await subscriptionsService.suspendSubscription(getRequiredParam(req, 'id'), req.body as SuspendSubscriptionInput, getAuthenticatedUserId(req));
  return sendSuccess(res, subscription, 'Suscripcion suspendida correctamente');
}

export async function reactivate(req: Request, res: Response) {
  const subscription = await subscriptionsService.reactivateSubscription(getRequiredParam(req, 'id'), req.body as ReactivateSubscriptionInput, getAuthenticatedUserId(req));
  return sendSuccess(res, subscription, 'Suscripcion reactivada correctamente');
}

export async function cancel(req: Request, res: Response) {
  const subscription = await subscriptionsService.cancelSubscription(getRequiredParam(req, 'id'), req.body as CancelSubscriptionInput, getAuthenticatedUserId(req));
  return sendSuccess(res, subscription, 'Suscripcion cancelada correctamente');
}

export async function changePlan(req: Request, res: Response) {
  const change = await subscriptionsService.changePlan(getRequiredParam(req, 'id'), req.body as ChangePlanInput, getAuthenticatedUserId(req));
  return sendSuccess(res, change, 'Cambio de plan registrado correctamente', 201);
}
