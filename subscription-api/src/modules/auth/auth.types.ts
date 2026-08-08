export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface AuthUserProfile extends AuthenticatedUser {
  fullName: string;
  status: string;
}

export interface LoginResult {
  token: string;
  user: AuthUserProfile;
}
