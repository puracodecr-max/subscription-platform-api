export interface SubscriptionExtension {
  id: string;
  subscriptionId: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  customerId: string;
  customerName: string;
  applicationId: string;
  applicationCode: string;
  originalDueDate: string;
  extendedDueDate: string;
  reason: string;
  authorizedBy: string;
  authorizedByName: string;
  authorizedAt: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
