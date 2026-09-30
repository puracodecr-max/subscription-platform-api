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
  return applicationsRepository.createApplication(normalizeApplicationInput(input), actorId);
}

export async function updateApplication(id: string, input: UpdateApplicationInput, actorId: string): Promise<Application> {
  const application = await applicationsRepository.updateApplication(id, normalizeApplicationInput(input), actorId);

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

function normalizeApplicationInput<T extends CreateApplicationInput | UpdateApplicationInput>(input: T): T {
  if (input.modules === undefined) {
    return input;
  }

  return {
    ...input,
    modules: normalizeModules(input.modules)
  };
}

function normalizeModules(modules: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const normalizedModules: Record<string, unknown>[] = [];

  for (const module of modules) {
    const rawCode = typeof module.code === 'string' ? module.code : typeof module.name === 'string' ? module.name : '';
    const code = rawCode.trim().toLowerCase();

    if (!code || seen.has(code)) {
      continue;
    }

    seen.add(code);
    normalizedModules.push({
      ...module,
      code,
      name: typeof module.name === 'string' && module.name.trim() ? module.name.trim() : code
    });
  }

  return normalizedModules;
}
