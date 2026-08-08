import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import { getTotalPages, type PaginationInput } from '../../shared/http/pagination';
import type { AdjustmentInput, CancelInvoiceInput, GenerateInvoiceInput } from './invoices.dto';
import type { Invoice, InvoiceDetail } from './invoices.types';
import * as invoicesRepository from './invoices.repository';

export async function listInvoices(
  input: PaginationInput & { customerId?: string; subscriptionId?: string; status?: string; dueFrom?: string; dueTo?: string }
) {
  const { items, total } = await invoicesRepository.listInvoices(input);
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

export async function getInvoiceDetailById(id: string): Promise<InvoiceDetail> {
  const invoice = await invoicesRepository.getInvoiceDetailById(id);

  if (!invoice) {
    throw new ApiError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
  }

  return invoice;
}

export async function generateInvoice(input: GenerateInvoiceInput, actorId: string): Promise<Invoice> {
  return invoicesRepository.generateInvoice(input, actorId);
}

export async function addAdjustment(invoiceId: string, input: AdjustmentInput, actorId: string): Promise<InvoiceDetail> {
  return invoicesRepository.addAdjustment(invoiceId, input, actorId);
}

export async function cancelInvoice(invoiceId: string, input: CancelInvoiceInput, actorId: string): Promise<Invoice> {
  return invoicesRepository.cancelInvoice(invoiceId, input, actorId);
}
