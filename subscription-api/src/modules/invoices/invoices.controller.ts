import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/http/apiResponse';
import { parsePagination } from '../../shared/http/pagination';
import { getAuthenticatedUserId, getRequiredParam } from '../../shared/http/requestContext';
import type { AdjustmentInput, CancelInvoiceInput, GenerateInvoiceInput, ListInvoicesQuery } from './invoices.dto';
import * as invoicesService from './invoices.service';

export async function list(req: Request, res: Response) {
  const query = req.query as ListInvoicesQuery;
  const paginationInput = parsePagination(query);
  const result = await invoicesService.listInvoices({
    ...paginationInput,
    customerId: query.customerId,
    subscriptionId: query.subscriptionId,
    status: query.status,
    dueFrom: query.dueFrom,
    dueTo: query.dueTo
  });
  return sendSuccess(res, result.items, 'Facturas obtenidas correctamente', 200, result.pagination);
}

export async function getById(req: Request, res: Response) {
  const invoice = await invoicesService.getInvoiceDetailById(getRequiredParam(req, 'id'));
  return sendSuccess(res, invoice, 'Factura obtenida correctamente');
}

export async function generate(req: Request, res: Response) {
  const invoice = await invoicesService.generateInvoice(req.body as GenerateInvoiceInput, getAuthenticatedUserId(req));
  return sendSuccess(res, invoice, 'Factura generada correctamente', 201);
}

export async function addAdjustment(req: Request, res: Response) {
  const invoice = await invoicesService.addAdjustment(getRequiredParam(req, 'id'), req.body as AdjustmentInput, getAuthenticatedUserId(req));
  return sendSuccess(res, invoice, 'Ajuste aplicado correctamente');
}

export async function cancel(req: Request, res: Response) {
  const invoice = await invoicesService.cancelInvoice(getRequiredParam(req, 'id'), req.body as CancelInvoiceInput, getAuthenticatedUserId(req));
  return sendSuccess(res, invoice, 'Factura anulada correctamente');
}
