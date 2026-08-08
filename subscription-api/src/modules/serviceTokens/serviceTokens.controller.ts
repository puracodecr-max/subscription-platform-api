import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/http/apiResponse';
import { parsePagination } from '../../shared/http/pagination';
import { getAuthenticatedUserId, getRequiredParam } from '../../shared/http/requestContext';
import type { CreateServiceTokenInput, ListServiceTokensQuery, RevokeServiceTokenInput } from './serviceTokens.dto';
import * as serviceTokensService from './serviceTokens.service';

export async function list(req: Request, res: Response) {
  const query = req.query as ListServiceTokensQuery;
  const paginationInput = parsePagination(query);
  const result = await serviceTokensService.listServiceTokens({
    ...paginationInput,
    applicationId: query.applicationId,
    status: query.status
  });

  return sendSuccess(res, result.items, 'Tokens de servicio obtenidos correctamente', 200, result.pagination);
}

export async function getById(req: Request, res: Response) {
  const serviceToken = await serviceTokensService.getServiceTokenById(getRequiredParam(req, 'id'));
  return sendSuccess(res, serviceToken, 'Token de servicio obtenido correctamente');
}

export async function create(req: Request, res: Response) {
  const result = await serviceTokensService.createServiceToken(req.body as CreateServiceTokenInput, getAuthenticatedUserId(req));
  return sendSuccess(res, result, 'Token de servicio creado correctamente', 201);
}

export async function revoke(req: Request, res: Response) {
  const serviceToken = await serviceTokensService.revokeServiceToken(
    getRequiredParam(req, 'id'),
    req.body as RevokeServiceTokenInput,
    getAuthenticatedUserId(req)
  );

  return sendSuccess(res, serviceToken, 'Token de servicio revocado correctamente');
}
