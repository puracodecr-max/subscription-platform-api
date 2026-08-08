import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import { getTotalPages, type PaginationInput } from '../../shared/http/pagination';
import type { CreateApplicationInput, UpdateApplicationInput } from './applications.dto';
import type { Application } from './applications.types';
import * as applicationsRepository from './applications.repository';

export async function listApplications(input: PaginationInput & { status?: string; search?: string }) {
  const { items, total } = await applicationsRepository.listApplications(input);
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

export async function getApplicationById(id: string): Promise<Application> {
  const application = await applicationsRepository.getApplicationById(id);

  if (!application) {
    throw new ApiError('Application not found', 404, ErrorCodes.APPLICATION_NOT_FOUND);
  }

  return application;
}

export async function createApplication(input: CreateApplicationInput, actorId: string): Promise<Application> {
  return applicationsRepository.createApplication(input, actorId);
}

export async function updateApplication(id: string, input: UpdateApplicationInput, actorId: string): Promise<Application> {
  const application = await applicationsRepository.updateApplication(id, input, actorId);

  if (!application) {
    throw new ApiError('Application not found', 404, ErrorCodes.APPLICATION_NOT_FOUND);
  }

  return application;
}

export async function assertApplicationExists(id: string): Promise<void> {
  if (!(await applicationsRepository.applicationExists(id))) {
    throw new ApiError('Application not found', 404, ErrorCodes.APPLICATION_NOT_FOUND);
  }
}
