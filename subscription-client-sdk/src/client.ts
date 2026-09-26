import type { EntitlementResult, SdkConfig, ValidateEntitlementInput } from './types';
import {
  HttpError,
  InvalidConfigurationError,
  InvalidEntitlementInputError,
  NetworkError,
  SdkError,
  TimeoutError,
  UnexpectedResponseError
} from './errors';
import { MemoryCache } from './cache';

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_CACHE_TTL_MS = 600000;
const DEFAULT_DENIED_CACHE_TTL_MS = 30000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APPLICATION_CODE_PATTERN = /^[A-Z0-9_]+$/;

export class SubscriptionClient {
  private readonly config: Required<Pick<SdkConfig, 'baseUrl' | 'serviceToken' | 'apiPath' | 'timeoutMs' | 'cacheTtlMs' | 'deniedCacheTtlMs'>> &
    Pick<SdkConfig, 'defaultTenantId' | 'defaultBranchId'>;
  private readonly cache: MemoryCache<EntitlementResult>;

  constructor(config: SdkConfig) {
    if (!config.baseUrl) throw new InvalidConfigurationError('baseUrl is required');
    if (typeof config.serviceToken !== 'string' || !config.serviceToken.trim()) {
      throw new InvalidConfigurationError('serviceToken is required');
    }

    let baseUrl: URL;
    try {
      baseUrl = new URL(config.baseUrl);
    } catch {
      throw new InvalidConfigurationError('baseUrl must be an absolute URL');
    }

    if (!['http:', 'https:'].includes(baseUrl.protocol)) {
      throw new InvalidConfigurationError('baseUrl must use http or https');
    }
    if (baseUrl.pathname !== '/' || baseUrl.search || baseUrl.hash) {
      throw new InvalidConfigurationError('baseUrl must contain only the API origin; configure its path with apiPath');
    }

    if (typeof config.apiPath !== 'undefined' && typeof config.apiPath !== 'string') {
      throw new InvalidConfigurationError('apiPath must be a string');
    }
    if (config.defaultTenantId && !UUID_PATTERN.test(config.defaultTenantId)) {
      throw new InvalidConfigurationError('defaultTenantId must be a UUID');
    }
    if (config.defaultBranchId && !UUID_PATTERN.test(config.defaultBranchId)) {
      throw new InvalidConfigurationError('defaultBranchId must be a UUID');
    }

    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const cacheTtlMs = config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    const deniedCacheTtlMs = config.deniedCacheTtlMs ?? DEFAULT_DENIED_CACHE_TTL_MS;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new InvalidConfigurationError('timeoutMs must be greater than 0');
    }
    if (!Number.isFinite(cacheTtlMs) || cacheTtlMs < 0) {
      throw new InvalidConfigurationError('cacheTtlMs must be 0 or greater');
    }
    if (!Number.isFinite(deniedCacheTtlMs) || deniedCacheTtlMs < 0) {
      throw new InvalidConfigurationError('deniedCacheTtlMs must be 0 or greater');
    }

    this.config = {
      baseUrl: baseUrl.toString().replace(/\/+$/, ''),
      serviceToken: config.serviceToken.trim(),
      apiPath: normalizeApiPath(config.apiPath ?? '/api/v1'),
      defaultTenantId: config.defaultTenantId ?? undefined,
      defaultBranchId: config.defaultBranchId ?? undefined,
      timeoutMs,
      cacheTtlMs,
      deniedCacheTtlMs,
    };
    this.cache = new MemoryCache<EntitlementResult>(cacheTtlMs);
  }

  async validateEntitlement(input: ValidateEntitlementInput): Promise<EntitlementResult> {
    const normalizedInput = validateAndNormalizeInput(input);
    const cacheKey = this.buildCacheKey(normalizedInput);
    if (this.config.cacheTtlMs > 0 || this.config.deniedCacheTtlMs > 0) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const body = this.buildBody(normalizedInput);
    const response = await this.fetchJson<unknown>(
      '/entitlements/validate',
      { method: 'POST', body: JSON.stringify(body) }
    );

    if (!isApiEnvelope(response) || !response.success || !isEntitlementResult(response.data)) {
      throw new UnexpectedResponseError(200, response);
    }

    const ttlMs = response.data.allowed ? this.config.cacheTtlMs : this.config.deniedCacheTtlMs;
    if (ttlMs > 0) {
      this.cache.set(cacheKey, response.data, ttlMs);
    }
    return response.data;
  }

  invalidateEntitlement(input: ValidateEntitlementInput): void {
    this.cache.delete(this.buildCacheKey(validateAndNormalizeInput(input)));
  }

  clearCache(): void {
    this.cache.clear();
  }

  private buildCacheKey(input: ValidateEntitlementInput): string {
    return JSON.stringify([
      input.customerId,
      input.applicationCode,
      input.tenantId ?? this.config.defaultTenantId ?? '',
      input.branchId ?? this.config.defaultBranchId ?? '',
      input.requestedModule ?? ''
    ]);
  }

  private buildBody(input: ValidateEntitlementInput): unknown {
    return {
      customerId: input.customerId,
      applicationCode: input.applicationCode,
      tenantId: input.tenantId ?? this.config.defaultTenantId,
      branchId: input.branchId ?? this.config.defaultBranchId,
      requestedModule: input.requestedModule,
      metadata: input.metadata,
    };
  }

  private async fetchJson<T>(path: string, init: RequestInit): Promise<T> {
    const url = `${this.config.baseUrl}${this.config.apiPath}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.config.serviceToken}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const rawBody = await response.text();
      const body = parseBody(rawBody);

      if (!response.ok) {
        throw new HttpError(response.status, body);
      }

      if (typeof body !== 'object' || body === null) {
        throw new UnexpectedResponseError(response.status, body);
      }
      return body as T;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof SdkError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError('Request timed out', error);
      }
      throw new NetworkError('Network request failed', error);
    }
  }
}

function normalizeApiPath(apiPath: string): string {
  const trimmed = apiPath.trim();
  if (!trimmed || trimmed === '/') return '';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

function validateAndNormalizeInput(input: ValidateEntitlementInput): ValidateEntitlementInput {
  if (!input || typeof input !== 'object') {
    throw new InvalidEntitlementInputError('Entitlement input is required');
  }

  const customerId = requiredString(input.customerId, 'customerId');
  const applicationCode = requiredString(input.applicationCode, 'applicationCode');
  if (!UUID_PATTERN.test(customerId)) {
    throw new InvalidEntitlementInputError('customerId must be a UUID');
  }
  if (applicationCode.length > 80 || !APPLICATION_CODE_PATTERN.test(applicationCode)) {
    throw new InvalidEntitlementInputError('applicationCode must contain only A-Z, 0-9 or underscore');
  }

  const tenantId = optionalString(input.tenantId, 'tenantId');
  const branchId = optionalString(input.branchId, 'branchId');
  const requestedModule = optionalString(input.requestedModule, 'requestedModule');
  if (tenantId && !UUID_PATTERN.test(tenantId)) {
    throw new InvalidEntitlementInputError('tenantId must be a UUID');
  }
  if (branchId && !UUID_PATTERN.test(branchId)) {
    throw new InvalidEntitlementInputError('branchId must be a UUID');
  }
  if (requestedModule && requestedModule.length > 80) {
    throw new InvalidEntitlementInputError('requestedModule must not exceed 80 characters');
  }
  if (input.metadata !== undefined && (typeof input.metadata !== 'object' || input.metadata === null || Array.isArray(input.metadata))) {
    throw new InvalidEntitlementInputError('metadata must be an object');
  }

  return {
    customerId,
    applicationCode,
    ...(tenantId ? { tenantId } : {}),
    ...(branchId ? { branchId } : {}),
    ...(requestedModule ? { requestedModule } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {})
  };
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InvalidEntitlementInputError(`${field} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) {
    throw new InvalidEntitlementInputError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function isApiEnvelope(value: unknown): value is { success: boolean; data?: unknown } {
  return typeof value === 'object' && value !== null && 'success' in value && typeof value.success === 'boolean';
}

function isEntitlementResult(value: unknown): value is EntitlementResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Record<string, unknown>;
  return typeof result.allowed === 'boolean'
    && typeof result.customerId === 'string'
    && typeof result.applicationCode === 'string'
    && nullableString(result.applicationId)
    && nullableString(result.subscriptionId)
    && nullableString(result.subscriptionStatus)
    && nullableString(result.validUntil)
    && nullableString(result.reason)
    && nullableString(result.gracePeriodEnd)
    && nullableString(result.outstandingBalance)
    && typeof result.daysOverdue === 'number'
    && nullableString(result.warningCode)
    && stringArray(result.allowedModules)
    && stringArray(result.blockedModules);
}

function nullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function stringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseBody(value: string): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
