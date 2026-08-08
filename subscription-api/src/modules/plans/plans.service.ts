import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import { getTotalPages, type PaginationInput } from '../../shared/http/pagination';
import { assertApplicationExists } from '../applications/applications.service';
import type { CreatePlanInput, UpdatePlanInput } from './plans.dto';
import type { Plan } from './plans.types';
import * as plansRepository from './plans.repository';

export async function listPlans(input: PaginationInput & { applicationId?: string; status?: string; search?: string }) {
  const { items, total } = await plansRepository.listPlans(input);
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

export async function getPlanById(id: string): Promise<Plan> {
  const plan = await plansRepository.getPlanById(id);

  if (!plan) {
    throw new ApiError('Plan not found', 404, ErrorCodes.PLAN_NOT_FOUND);
  }

  return plan;
}

export async function createPlan(input: CreatePlanInput, actorId: string): Promise<Plan> {
  await assertApplicationExists(input.applicationId);
  return plansRepository.createPlan(input, actorId);
}

export async function updatePlan(id: string, input: UpdatePlanInput, actorId: string): Promise<Plan> {
  if (input.applicationId) {
    await assertApplicationExists(input.applicationId);
  }

  const plan = await plansRepository.updatePlan(id, input, actorId);

  if (!plan) {
    throw new ApiError('Plan not found', 404, ErrorCodes.PLAN_NOT_FOUND);
  }

  return plan;
}

export async function assertPlanMatchesApplication(planId: string, applicationId: string): Promise<void> {
  if (!(await plansRepository.planMatchesApplication(planId, applicationId))) {
    throw new ApiError('Plan does not belong to the selected application', 400, ErrorCodes.INVALID_PLAN_APPLICATION);
  }
}
