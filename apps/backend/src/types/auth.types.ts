// ─── Shared Domain Types ─────────────────────────────────────────────────────

export type UserRole = 'USER' | 'PROFESSIONAL' | 'ADMIN';

/** Row as returned by the DB (never expose password_hash to the client) */
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: UserRole;
  bio: string | null;
  specialties: string[] | null;
  instagram_url: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

/** Safe user object sent to the client */
export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  bio: string | null;
  specialties: string[] | null;
  instagramUrl: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

// ─── Auth DTOs ────────────────────────────────────────────────────────────────

export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'USER' | 'PROFESSIONAL' | 'ADMIN';
}

export interface UpdateUserDTO {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  bio?: string | null;
  instagramUrl?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;         // user id
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
