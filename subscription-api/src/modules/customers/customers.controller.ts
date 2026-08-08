import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/http/apiResponse';
import { parsePagination } from '../../shared/http/pagination';
import { getAuthenticatedUserId, getRequiredParam } from '../../shared/http/requestContext';
import type { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from './customers.dto';
import * as customersService from './customers.service';

export async function list(req: Request, res: Response) {
  const query = req.query as ListCustomersQuery;
  const paginationInput = parsePagination(query);
  const result = await customersService.listCustomers({ ...paginationInput, status: query.status, search: query.search });
  return sendSuccess(res, result.items, 'Clientes obtenidos correctamente', 200, result.pagination);
}

export async function getById(req: Request, res: Response) {
  const customer = await customersService.getCustomerById(getRequiredParam(req, 'id'));
  return sendSuccess(res, customer, 'Cliente obtenido correctamente');
}

export async function create(req: Request, res: Response) {
  const customer = await customersService.createCustomer(req.body as CreateCustomerInput, getAuthenticatedUserId(req));
  return sendSuccess(res, customer, 'Cliente creado correctamente', 201);
}

export async function update(req: Request, res: Response) {
  const customer = await customersService.updateCustomer(getRequiredParam(req, 'id'), req.body as UpdateCustomerInput, getAuthenticatedUserId(req));
  return sendSuccess(res, customer, 'Cliente actualizado correctamente');
}
