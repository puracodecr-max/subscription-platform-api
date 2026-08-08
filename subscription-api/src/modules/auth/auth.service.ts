import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { ApiError } from '../../shared/errors/ApiError';
import { ErrorCodes } from '../../shared/errors/errorCodes';
import type { LoginInput } from './auth.dto';
import type { AuthUserProfile, LoginResult } from './auth.types';
import { findUserByEmail, listPermissionCodesByUserId, listRoleCodesByUserId, markUserLogin } from './auth.repository';

function buildProfile(user: { id: string; email: string; fullName: string; status: string }, roles: string[], permissions: string[]): AuthUserProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    status: user.status,
    roles,
    permissions
  };
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const user = await findUserByEmail(input.username.trim().toLowerCase());

  if (!user || user.status !== 'ACTIVE') {
    throw new ApiError('Invalid credentials', 401, ErrorCodes.INVALID_CREDENTIALS);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError('Invalid credentials', 401, ErrorCodes.INVALID_CREDENTIALS);
  }

  const [roles, permissions] = await Promise.all([
    listRoleCodesByUserId(user.id),
    listPermissionCodesByUserId(user.id)
  ]);

  if (roles.length === 0) {
    throw new ApiError('User has no active roles', 403, ErrorCodes.FORBIDDEN_OPERATION);
  }

  await markUserLogin(user.id);

  const profile = buildProfile(user, roles, permissions);
  const signOptions: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  const token = jwt.sign(
    {
      email: profile.email,
      roles: profile.roles,
      permissions: profile.permissions
    },
    env.JWT_SECRET,
    {
      subject: profile.id,
      ...signOptions
    }
  );

  return { token, user: profile };
}
