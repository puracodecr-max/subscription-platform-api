import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import { getTotalPages, type PaginationInput } from '../../shared/http/pagination';
import type { Permission, Role } from './roles.types';
import * as rolesRepository from './roles.repository';

export async function listRoles(input: PaginationInput & { status?: string }) {
  const { items, total } = await rolesRepository.listRoles(input);
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

export async function getRoleById(id: string): Promise<Role> {
  const role = await rolesRepository.getRoleById(id);

  if (!role) {
    throw new ApiError('Role not found', 404, ErrorCodes.ROLE_NOT_FOUND);
  }

  return role;
}

export async function listPermissionsByRoleId(roleId: string): Promise<Permission[]> {
  await getRoleById(roleId);
  return rolesRepository.listPermissionsByRoleId(roleId);
}
