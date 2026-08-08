import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import { getTotalPages, type PaginationInput } from '../../shared/http/pagination';
import type { ApplyPenaltyInput, WaivePenaltyInput } from './penalties.dto';
import type { Penalty } from './penalties.types';
import * as penaltiesRepository from './penalties.repository';

export async function listPenalties(input: PaginationInput & { invoiceId?: string; subscriptionId?: string; customerId?: string; status?: string }) {
  const { items, total } = await penaltiesRepository.listPenalties(input);
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

export async function getPenaltyById(id: string): Promise<Penalty> {
  const penalty = await penaltiesRepository.getPenaltyById(id);

  if (!penalty) {
    throw new ApiError('Penalty not found', 404, ErrorCodes.PENALTY_NOT_FOUND);
  }

  return penalty;
}

export async function listPenaltyRules(input: PaginationInput & { applicationId?: string; planId?: string; status?: string }) {
  const { items, total } = await penaltiesRepository.listPenaltyRules(input);
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

export async function applyPenalty(input: ApplyPenaltyInput, actorId: string): Promise<Penalty> {
  return penaltiesRepository.applyPenalty(input, actorId);
}

export async function waivePenalty(id: string, input: WaivePenaltyInput, actorId: string): Promise<Penalty> {
  return penaltiesRepository.waivePenalty(id, input, actorId);
}
