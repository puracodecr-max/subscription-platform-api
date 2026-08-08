export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  currencyId: string;
  currencyCode: string;
  externalReference: string | null;
  idempotencyKey: string | null;
  amount: string;
  unappliedAmount: string;
  paidAt: string | null;
  receivedAt: string;
  confirmedAt: string | null;
  rejectedAt: string | null;
  reversedAt: string | null;
  reversedPaymentId: string | null;
  status: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: string;
  appliedToBase: string;
  appliedToTax: string;
  appliedToPenalty: string;
  status: string;
  allocatedAt: string;
  reversedAt: string | null;
}

export interface PaymentDetail extends Payment {
  allocations: PaymentAllocation[];
}
