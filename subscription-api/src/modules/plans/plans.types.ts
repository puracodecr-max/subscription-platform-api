export interface Plan {
  id: string;
  applicationId: string;
  code: string;
  name: string;
  description: string | null;
  price: string;
  currencyId: string;
  currencyCode: string;
  frequency: string;
  gracePeriodDays: number;
  suspensionAfterDueDays: number;
  penaltyType: string;
  penaltyValue: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
