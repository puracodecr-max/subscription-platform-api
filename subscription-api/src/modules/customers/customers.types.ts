export interface Customer {
  id: string;
  externalCode: string | null;
  legalName: string;
  displayName: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  globalSuspension: boolean;
  globalSuspensionReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
