import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/http/apiResponse';
import { parsePagination } from '../../shared/http/pagination';
import { getAuthenticatedUserId, getRequiredParam } from '../../shared/http/requestContext';
import type { CancelExtensionInput, CreateExtensionInput, ListExtensionsQuery } from './extensions.dto';
import * as extensionsService from './extensions.service';

export async function list(req: Request, res: Response) {
  const query = req.query as ListExtensionsQuery;
  const paginationInput = parsePagination(query);
  const result = await extensionsService.listExtensions({
    ...paginationInput,
    subscriptionId: query.subscriptionId,
    invoiceId: query.invoiceId,
    customerId: query.customerId,
    status: query.status
  });
  return sendSuccess(res, result.items, 'Prorrogas obtenidas correctamente', 200, result.pagination);
}

export async function getById(req: Request, res: Response) {
  const extension = await extensionsService.getExtensionById(getRequiredParam(req, 'id'));
  return sendSuccess(res, extension, 'Prorroga obtenida correctamente');
}

export async function create(req: Request, res: Response) {
  const extension = await extensionsService.createExtension(req.body as CreateExtensionInput, getAuthenticatedUserId(req));
  return sendSuccess(res, extension, 'Prorroga creada correctamente', 201);
}

export async function cancel(req: Request, res: Response) {
  const extension = await extensionsService.cancelExtension(getRequiredParam(req, 'id'), req.body as CancelExtensionInput, getAuthenticatedUserId(req));
  return sendSuccess(res, extension, 'Prorroga cancelada correctamente');
}
