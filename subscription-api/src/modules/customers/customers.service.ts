import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import { getTotalPages, type PaginationInput } from '../../shared/http/pagination';
import type { CreateCustomerInput, UpdateCustomerInput } from './customers.dto';
import type { Customer } from './customers.types';
import * as customersRepository from './customers.repository';

export async function listCustomers(input: PaginationInput & { status?: string; search?: string }) {
  const { items, total } = await customersRepository.listCustomers(input);
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

export async function getCustomerById(id: string): Promise<Customer> {
  const customer = await customersRepository.getCustomerById(id);

  if (!customer) {
    throw new ApiError('Customer not found', 404, ErrorCodes.CUSTOMER_NOT_FOUND);
  }

  return customer;
}

export async function createCustomer(input: CreateCustomerInput, actorId: string): Promise<Customer> {
  return customersRepository.createCustomer(input, actorId);
}

export async function updateCustomer(id: string, input: UpdateCustomerInput, actorId: string): Promise<Customer> {
  const customer = await customersRepository.updateCustomer(id, input, actorId);

  if (!customer) {
    throw new ApiError('Customer not found', 404, ErrorCodes.CUSTOMER_NOT_FOUND);
  }

  return customer;
}
