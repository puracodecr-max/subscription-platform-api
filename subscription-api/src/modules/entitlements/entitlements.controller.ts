import type { Request, Response } from 'express';
import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import { sendSuccess } from '../../shared/http/apiResponse';
import type { ValidateEntitlementInput } from './entitlements.dto';
import * as entitlementsService from './entitlements.service';

export async function validate(req: Request, res: Response) {
  if (!req.serviceToken) {
    throw new ApiError('Service token is required', 401, ErrorCodes.UNAUTHORIZED_OPERATION);
  }

  const result = await entitlementsService.validateEntitlement(req.body as ValidateEntitlementInput, {
    serviceTokenId: req.serviceToken.id,
    serviceTokenApplicationId: req.serviceToken.applicationId,
    serviceTokenApplicationCode: req.serviceToken.applicationCode,
    ipAddress: req.ip ?? null
  });

  return sendSuccess(res, result, result.allowed ? 'Acceso permitido' : 'Acceso bloqueado');
}
