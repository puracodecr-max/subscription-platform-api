export interface Invoice {
  id: string;
  subscriptionId: string;
  customerId: string;
  customerName: string;
  applicationId: string;
  applicationCode: string;
  planId: string;
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issueDate: string;
  dueDate: string;
  planNameSnapshot: string;
  planPriceSnapshot: string;
  currencyId: string;
  currencyCode: string;
  baseAmount: string;
  discountAmount: string;
  taxAmount: string;
  penaltyAmount: string;
  adjustmentAmount: string;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  itemType: string;
  description: string;
  quantity: string;
  unitAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface InvoicePaymentAllocation {
  id: string;
  paymentId: string;
  paymentStatus: string;
  amount: string;
  appliedToBase: string;
  appliedToTax: string;
  appliedToPenalty: string;
  status: string;
  allocatedAt: string;
}

export interface InvoiceDetail extends Invoice {
  items: InvoiceItem[];
  paymentAllocations: InvoicePaymentAllocation[];
}
