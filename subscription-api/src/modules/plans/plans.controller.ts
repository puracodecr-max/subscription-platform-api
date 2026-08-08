import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/http/apiResponse';
import { parsePagination } from '../../shared/http/pagination';
import { getAuthenticatedUserId, getRequiredParam } from '../../shared/http/requestContext';
import type { CreatePlanInput, ListPlansQuery, UpdatePlanInput } from './plans.dto';
import * as plansService from './plans.service';

export async function list(req: Request, res: Response) {
  const query = req.query as ListPlansQuery;
  const paginationInput = parsePagination(query);
  const result = await plansService.listPlans({
    ...paginationInput,
    applicationId: query.applicationId,
    status: query.status,
    search: query.search
  });
  return sendSuccess(res, result.items, 'Planes obtenidos correctamente', 200, result.pagination);
}

export async function getById(req: Request, res: Response) {
  const plan = await plansService.getPlanById(getRequiredParam(req, 'id'));
  return sendSuccess(res, plan, 'Plan obtenido correctamente');
}

export async function create(req: Request, res: Response) {
  const plan = await plansService.createPlan(req.body as CreatePlanInput, getAuthenticatedUserId(req));
  return sendSuccess(res, plan, 'Plan creado correctamente', 201);
}

export async function update(req: Request, res: Response) {
  const plan = await plansService.updatePlan(getRequiredParam(req, 'id'), req.body as UpdatePlanInput, getAuthenticatedUserId(req));
  return sendSuccess(res, plan, 'Plan actualizado correctamente');
}
