import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/http/apiResponse';
import { parsePagination } from '../../shared/http/pagination';
import { getAuthenticatedUserId, getRequiredParam } from '../../shared/http/requestContext';
import type { CreateApplicationInput, ListApplicationsQuery, UpdateApplicationInput } from './applications.dto';
import * as applicationsService from './applications.service';

export async function list(req: Request, res: Response) {
  const query = req.query as ListApplicationsQuery;
  const paginationInput = parsePagination(query);
  const result = await applicationsService.listApplications({ ...paginationInput, status: query.status, search: query.search });
  return sendSuccess(res, result.items, 'Aplicaciones obtenidas correctamente', 200, result.pagination);
}

export async function getById(req: Request, res: Response) {
  const application = await applicationsService.getApplicationById(getRequiredParam(req, 'id'));
  return sendSuccess(res, application, 'Aplicacion obtenida correctamente');
}

export async function create(req: Request, res: Response) {
  const application = await applicationsService.createApplication(req.body as CreateApplicationInput, getAuthenticatedUserId(req));
  return sendSuccess(res, application, 'Aplicacion creada correctamente', 201);
}

export async function update(req: Request, res: Response) {
  const application = await applicationsService.updateApplication(getRequiredParam(req, 'id'), req.body as UpdateApplicationInput, getAuthenticatedUserId(req));
  return sendSuccess(res, application, 'Aplicacion actualizada correctamente');
}
