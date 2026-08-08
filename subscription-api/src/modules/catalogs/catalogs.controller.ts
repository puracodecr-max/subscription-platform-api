import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/http/apiResponse';
import * as catalogsService from './catalogs.service';

export async function listCurrencies(_req: Request, res: Response) {
  const currencies = await catalogsService.listCurrencies();
  return sendSuccess(res, currencies, 'Monedas obtenidas correctamente');
}

export async function listPaymentMethods(_req: Request, res: Response) {
  const methods = await catalogsService.listPaymentMethods();
  return sendSuccess(res, methods, 'Metodos de pago obtenidos correctamente');
}
