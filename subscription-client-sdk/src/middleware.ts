import type { Request, Response, NextFunction } from 'express';
import { SubscriptionClient } from './client';
import {
  EntitlementDeniedError,
  HttpError,
  InvalidConfigurationError,
  InvalidEntitlementInputError,
  NetworkError
} from './errors';
import type { EntitlementResult, ValidateEntitlementInput } from './types';

export type EntitlementFailureMode = 'closed' | 'open';

export interface EntitlementRequest extends Request {
  entitlement?: EntitlementResult;
  entitlementValidationError?: unknown;
}

export interface EntitlementMiddlewareOptions {
  resolveContext: (req: Request) => ValidateEntitlementInput | Promise<ValidateEntitlementInput>;
  failureMode?: EntitlementFailureMode;
}

export function requireEntitlement(
  client: SubscriptionClient,
  options: EntitlementMiddlewareOptions
): (req: EntitlementRequest, res: Response, next: NextFunction) => void {
  if (!options || typeof options.resolveContext !== 'function') {
    throw new InvalidConfigurationError('resolveContext is required');
  }

  const failureMode = options.failureMode ?? 'closed';
  if (failureMode !== 'closed' && failureMode !== 'open') {
    throw new InvalidConfigurationError('failureMode must be closed or open');
  }

  return async (req: EntitlementRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context = await options.resolveContext(req);
      assertContext(context);
      const result = await client.validateEntitlement(context);

      req.entitlement = result;
      if (!result.allowed) {
        const error = new EntitlementDeniedError(result);
        res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: error.message },
          data: result
        });
        return;
      }

      next();
    } catch (error) {
      if (error instanceof InvalidConfigurationError || error instanceof InvalidEntitlementInputError) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ENTITLEMENT_CONTEXT', message: error.message } });
        return;
      }

      if (failureMode === 'open' && isTransientValidationError(error)) {
        req.entitlementValidationError = error;
        next();
        return;
      }

      res.status(503).json({
        success: false,
        error: { code: 'ENTITLEMENT_VALIDATION_UNAVAILABLE', message: 'Unable to validate entitlement' }
      });
    }
  };
}

function isTransientValidationError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  return error instanceof HttpError && (error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500);
}

function assertContext(context: ValidateEntitlementInput | null | undefined): asserts context is ValidateEntitlementInput {
  if (!context || typeof context.customerId !== 'string' || !context.customerId.trim()) {
    throw new InvalidConfigurationError('resolveContext must provide customerId');
  }
  if (typeof context.applicationCode !== 'string' || !context.applicationCode.trim()) {
    throw new InvalidConfigurationError('resolveContext must provide applicationCode');
  }
}
