import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import { getTotalPages, type PaginationInput } from '../../shared/http/pagination';
import { getCustomerById } from '../customers/customers.service';
import { assertApplicationExists } from '../applications/applications.service';
import { assertPlanMatchesApplication } from '../plans/plans.service';
import type {
  CancelSubscriptionInput,
  ChangePlanInput,
  CreateSubscriptionInput,
  ReactivateSubscriptionInput,
  SuspendSubscriptionInput,
  UpdateSubscriptionInput
} from './subscriptions.dto';
import type { Subscription, SubscriptionPlanChange } from './subscriptions.types';
import * as subscriptionsRepository from './subscriptions.repository';

export async function listSubscriptions(input: PaginationInput & { customerId?: string; applicationId?: string; status?: string }) {
  const { items, total } = await subscriptionsRepository.listSubscriptions(input);
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

export async function getSubscriptionById(id: string): Promise<Subscription> {
  const subscription = await subscriptionsRepository.getSubscriptionById(id);

  if (!subscription) {
    throw new ApiError('Subscription not found', 404, ErrorCodes.SUBSCRIPTION_NOT_FOUND);
  }

  return subscription;
}

export async function createSubscription(input: CreateSubscriptionInput, actorId: string): Promise<Subscription> {
  await getCustomerById(input.customerId);
  await assertApplicationExists(input.applicationId);
  await assertPlanMatchesApplication(input.planId, input.applicationId);
  return subscriptionsRepository.createSubscription(input, actorId);
}

export async function updateSubscription(id: string, input: UpdateSubscriptionInput, actorId: string): Promise<Subscription> {
  const subscription = await subscriptionsRepository.updateSubscription(id, input, actorId);

  if (!subscription) {
    throw new ApiError('Subscription not found', 404, ErrorCodes.SUBSCRIPTION_NOT_FOUND);
  }

  return subscription;
}

export async function suspendSubscription(id: string, input: SuspendSubscriptionInput, actorId: string): Promise<Subscription> {
  const subscription = await subscriptionsRepository.suspendSubscription(id, input.suspensionType, input.reason, actorId);

  if (!subscription) {
    throw new ApiError('Subscription not found', 404, ErrorCodes.SUBSCRIPTION_NOT_FOUND);
  }

  return subscription;
}

export async function reactivateSubscription(id: string, input: ReactivateSubscriptionInput, actorId: string): Promise<Subscription> {
  const subscription = await subscriptionsRepository.reactivateSubscription(
    id,
    actorId,
    input.reason ?? null,
    input.forceAdministrative ?? false
  );

  if (!subscription) {
    throw new ApiError('Subscription not found', 404, ErrorCodes.SUBSCRIPTION_NOT_FOUND);
  }

  return subscription;
}

export async function cancelSubscription(id: string, input: CancelSubscriptionInput, actorId: string): Promise<Subscription> {
  const subscription = await subscriptionsRepository.cancelSubscription(id, actorId, input.reason);

  if (!subscription) {
    throw new ApiError('Subscription not found', 404, ErrorCodes.SUBSCRIPTION_NOT_FOUND);
  }

  return subscription;
}

export async function changePlan(id: string, input: ChangePlanInput, actorId: string): Promise<SubscriptionPlanChange> {
  const subscription = await getSubscriptionById(id);

  if (subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED') {
    throw new ApiError('Subscription cannot change plan in its current status', 400, ErrorCodes.INVALID_STATUS_TRANSITION);
  }

  if (subscription.planId === input.newPlanId) {
    throw new ApiError('New plan must be different from current plan', 400, ErrorCodes.INVALID_PLAN_APPLICATION);
  }

  await assertPlanMatchesApplication(input.newPlanId, subscription.applicationId);
  return subscriptionsRepository.createPlanChange(subscription, input, actorId);
}
