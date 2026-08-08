import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/http/apiResponse';
import type { LoginInput } from './auth.dto';
import * as authService from './auth.service';

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body as LoginInput);
  return sendSuccess(res, result, 'Sesion iniciada correctamente');
}

export async function logout(_req: Request, res: Response) {
  return sendSuccess(res, null, 'Sesion cerrada correctamente');
}

export async function me(req: Request, res: Response) {
  return sendSuccess(res, req.user, 'Usuario autenticado');
}
