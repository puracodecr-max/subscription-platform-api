import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/http/apiResponse';
import { parsePagination } from '../../shared/http/pagination';
import { getAuthenticatedUserId, getRequiredParam } from '../../shared/http/requestContext';
import type { ApplyPenaltyInput, ListPenaltiesQuery, ListPenaltyRulesQuery, WaivePenaltyInput } from './penalties.dto';
import * as penaltiesService from './penalties.service';

export async function list(req: Request, res: Response) {
  const query = req.query as ListPenaltiesQuery;
  const paginationInput = parsePagination(query);
  const result = await penaltiesService.listPenalties({
    ...paginationInput,
    invoiceId: query.invoiceId,
    subscriptionId: query.subscriptionId,
    customerId: query.customerId,
    status: query.status
  });
  return sendSuccess(res, result.items, 'Multas obtenidas correctamente', 200, result.pagination);
}

export async function getById(req: Request, res: Response) {
  const penalty = await penaltiesService.getPenaltyById(getRequiredParam(req, 'id'));
  return sendSuccess(res, penalty, 'Multa obtenida correctamente');
}

export async function listRules(req: Request, res: Response) {
  const query = req.query as ListPenaltyRulesQuery;
  const paginationInput = parsePagination(query);
  const result = await penaltiesService.listPenaltyRules({
    ...paginationInput,
    applicationId: query.applicationId,
    planId: query.planId,
    status: query.status
  });
  return sendSuccess(res, result.items, 'Reglas de multa obtenidas correctamente', 200, result.pagination);
}

export async function apply(req: Request, res: Response) {
  const penalty = await penaltiesService.applyPenalty(req.body as ApplyPenaltyInput, getAuthenticatedUserId(req));
  return sendSuccess(res, penalty, 'Multa aplicada correctamente', 201);
}

export async function waive(req: Request, res: Response) {
  const penalty = await penaltiesService.waivePenalty(getRequiredParam(req, 'id'), req.body as WaivePenaltyInput, getAuthenticatedUserId(req));
  return sendSuccess(res, penalty, 'Multa condonada correctamente');
}
