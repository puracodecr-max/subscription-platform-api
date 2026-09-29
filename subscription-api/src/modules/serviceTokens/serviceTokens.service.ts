import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import { getTotalPages, type PaginationInput } from '../../shared/http/pagination';
import type { CreateServiceTokenInput, RevokeServiceTokenInput } from './serviceTokens.dto';
import * as serviceTokensRepository from './serviceTokens.repository';

export async function listServiceTokens(params: PaginationInput & { applicationId?: string; status?: string }) {
  const result = await serviceTokensRepository.listServiceTokens(params);

  return {
    items: result.items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total: result.total,
      totalPages: getTotalPages(result.total, params.limit)
    }
  };
}

export async function getServiceTokenById(id: string) {
  const serviceToken = await serviceTokensRepository.getServiceTokenById(id);

  if (!serviceToken) {
    throw new ApiError('Service token not found', 404, ErrorCodes.VALIDATION_ERROR);
  }

  return serviceToken;
}

export function createServiceToken(input: CreateServiceTokenInput, actorId: string) {
  if (input.expiresAt) {
    const expiresAt = new Date(input.expiresAt);
    if (expiresAt.getTime() <= Date.now()) {
      throw new ApiError(
        'Service token expiration date must be in the future',
        400,
        ErrorCodes.SERVICE_TOKEN_EXPIRES_AT_IN_PAST,
        { field: 'expiresAt' }
      );
    }
  }

  return serviceTokensRepository.createServiceToken(input, actorId);
}

export async function revokeServiceToken(id: string, input: RevokeServiceTokenInput, actorId: string) {
  const serviceToken = await serviceTokensRepository.revokeServiceToken(id, input, actorId);

  if (!serviceToken) {
    throw new ApiError('Service token not found', 404, ErrorCodes.VALIDATION_ERROR);
  }

  return serviceToken;
}
