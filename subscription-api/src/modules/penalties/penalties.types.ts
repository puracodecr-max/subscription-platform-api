export interface Penalty {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  subscriptionId: string;
  customerId: string;
  customerName: string;
  applicationId: string;
  applicationCode: string;
  penaltyRuleId: string;
  penaltyRuleCode: string;
  penaltyRuleName: string;
  baseAmount: string;
  penaltyType: string;
  penaltyValue: string;
  amount: string;
  status: string;
  appliedAt: string;
  waivedAt: string | null;
  waivedBy: string | null;
  waivedByName: string | null;
  waivedReason: string | null;
  cancellationReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PenaltyRule {
  id: string;
  applicationId: string | null;
  applicationCode: string | null;
  planId: string | null;
  planName: string | null;
  code: string;
  name: string;
  description: string | null;
  penaltyType: string;
  penaltyValue: string;
  appliesAfterGrace: boolean;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
