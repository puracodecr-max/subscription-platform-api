import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import { getTotalPages, type PaginationInput } from '../../shared/http/pagination';
import type { CancelExtensionInput, CreateExtensionInput } from './extensions.dto';
import type { SubscriptionExtension } from './extensions.types';
import * as extensionsRepository from './extensions.repository';

export async function listExtensions(input: PaginationInput & { subscriptionId?: string; invoiceId?: string; customerId?: string; status?: string }) {
  const { items, total } = await extensionsRepository.listExtensions(input);
  return {
    items,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: getTotalPages(total, input.limit)
    }
  };
}

export async function getExtensionById(id: string): Promise<SubscriptionExtension> {
  const extension = await extensionsRepository.getExtensionById(id);

  if (!extension) {
    throw new ApiError('Extension not found', 404, ErrorCodes.EXTENSION_NOT_FOUND);
  }

  return extension;
}

export async function createExtension(input: CreateExtensionInput, actorId: string): Promise<SubscriptionExtension> {
  return extensionsRepository.createExtension(input, actorId);
}

export async function cancelExtension(id: string, input: CancelExtensionInput, actorId: string): Promise<SubscriptionExtension> {
  return extensionsRepository.cancelExtension(id, input, actorId);
}
