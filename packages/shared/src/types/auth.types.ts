export type UserRole = 'ADMIN' | 'MEMBER';
export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface JWTPayload {
  sub: string;
  email: string;
  orgId: string;
  role: UserRole;
  iat: number;
  exp: number;
  iss: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
