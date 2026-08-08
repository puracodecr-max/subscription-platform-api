import type { AuthenticatedUser } from '../modules/auth/auth.types';
import type { AuthenticatedServiceToken } from '../modules/serviceTokens/serviceTokens.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      serviceToken?: AuthenticatedServiceToken;
    }
  }
}

export {};
