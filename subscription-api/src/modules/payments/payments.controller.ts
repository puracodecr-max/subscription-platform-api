import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/http/apiResponse';
import { parsePagination } from '../../shared/http/pagination';
import { getAuthenticatedUserId, getRequiredParam } from '../../shared/http/requestContext';
import type { CreatePaymentInput, ListPaymentsQuery, PaymentActionInput, RejectPaymentInput } from './payments.dto';
import * as paymentsService from './payments.service';

export async function list(req: Request, res: Response) {
  const query = req.query as ListPaymentsQuery;
  const paginationInput = parsePagination(query);
  const result = await paymentsService.listPayments({
    ...paginationInput,
    customerId: query.customerId,
    status: query.status,
    receivedFrom: query.receivedFrom,
    receivedTo: query.receivedTo
  });
  return sendSuccess(res, result.items, 'Pagos obtenidos correctamente', 200, result.pagination);
}

export async function getById(req: Request, res: Response) {
  const payment = await paymentsService.getPaymentDetailById(getRequiredParam(req, 'id'));
  return sendSuccess(res, payment, 'Pago obtenido correctamente');
}

export async function create(req: Request, res: Response) {
  const payment = await paymentsService.createPayment(req.body as CreatePaymentInput, getAuthenticatedUserId(req));
  return sendSuccess(res, payment, 'Pago registrado correctamente', 201);
}

export async function confirm(req: Request, res: Response) {
  const payment = await paymentsService.confirmPayment(getRequiredParam(req, 'id'), getAuthenticatedUserId(req));
  return sendSuccess(res, payment, 'Pago confirmado correctamente');
}

export async function reject(req: Request, res: Response) {
  const payment = await paymentsService.rejectPayment(getRequiredParam(req, 'id'), req.body as RejectPaymentInput, getAuthenticatedUserId(req));
  return sendSuccess(res, payment, 'Pago rechazado correctamente');
}

export async function reverse(req: Request, res: Response) {
  const payment = await paymentsService.reversePayment(getRequiredParam(req, 'id'), req.body as PaymentActionInput, getAuthenticatedUserId(req));
  return sendSuccess(res, payment, 'Pago reversado correctamente');
}
