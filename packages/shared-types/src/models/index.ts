export * from './services.types';
export * from './discounts.types';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthResponse extends AuthToken {
  user: User;
}
