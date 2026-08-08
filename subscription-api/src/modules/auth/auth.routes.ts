import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { authenticate } from '../../shared/middleware/authenticate';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { loginSchema } from './auth.dto';
import * as authController from './auth.controller';

export const authRouter = Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login administrativo
 */
authRouter.post('/login', validateRequest({ body: loginSchema }), asyncHandler(authController.login));
authRouter.post('/logout', authenticate, asyncHandler(authController.logout));
authRouter.get('/me', authenticate, asyncHandler(authController.me));
