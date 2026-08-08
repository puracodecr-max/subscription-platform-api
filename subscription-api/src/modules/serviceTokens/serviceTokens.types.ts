export interface AuthenticatedServiceToken {
  id: string;
  applicationId: string | null;
  applicationCode: string | null;
  scopes: string[];
}

export interface ServiceToken {
  id: string;
  applicationId: string | null;
  applicationCode: string | null;
  applicationName: string | null;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  status: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatedServiceToken {
  token: string;
  serviceToken: ServiceToken;
}
