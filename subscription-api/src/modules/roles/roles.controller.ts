import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/http/apiResponse';
import { parsePagination } from '../../shared/http/pagination';
import { getRequiredParam } from '../../shared/http/requestContext';
import type { ListRolesQuery } from './roles.dto';
import * as rolesService from './roles.service';

export async function list(req: Request, res: Response) {
  const query = req.query as ListRolesQuery;
  const paginationInput = parsePagination(query);
  const result = await rolesService.listRoles({ ...paginationInput, status: query.status });
  return sendSuccess(res, result.items, 'Roles obtenidos correctamente', 200, result.pagination);
}

export async function getById(req: Request, res: Response) {
  const role = await rolesService.getRoleById(getRequiredParam(req, 'id'));
  return sendSuccess(res, role, 'Rol obtenido correctamente');
}

export async function listPermissions(req: Request, res: Response) {
  const permissions = await rolesService.listPermissionsByRoleId(getRequiredParam(req, 'id'));
  return sendSuccess(res, permissions, 'Permisos del rol obtenidos correctamente');
}
