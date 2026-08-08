import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import { getTotalPages, type PaginationInput } from '../../shared/http/pagination';
import type { CreatePaymentInput, PaymentActionInput, RejectPaymentInput } from './payments.dto';
import type { PaymentDetail } from './payments.types';
import * as paymentsRepository from './payments.repository';

export async function listPayments(input: PaginationInput & { customerId?: string; status?: string; receivedFrom?: string; receivedTo?: string }) {
  const { items, total } = await paymentsRepository.listPayments(input);
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

export async function getPaymentDetailById(id: string): Promise<PaymentDetail> {
  const payment = await paymentsRepository.getPaymentDetailById(id);

  if (!payment) {
    throw new ApiError('Payment not found', 404, ErrorCodes.PAYMENT_NOT_FOUND);
  }

  return payment;
}

export async function createPayment(input: CreatePaymentInput, actorId: string): Promise<PaymentDetail> {
  return paymentsRepository.createPayment(input, actorId);
}

export async function confirmPayment(id: string, actorId: string): Promise<PaymentDetail> {
  return paymentsRepository.confirmPayment(id, actorId);
}

export async function rejectPayment(id: string, input: RejectPaymentInput, actorId: string): Promise<PaymentDetail> {
  return paymentsRepository.rejectPayment(id, input, actorId);
}

export async function reversePayment(id: string, input: PaymentActionInput, actorId: string): Promise<PaymentDetail> {
  return paymentsRepository.reversePayment(id, input, actorId);
}
