import jwt from 'jsonwebtoken';
import { env } from '@config/env';

export interface JwtPayload {
  userId: string;
  email: string;
}

export function generateToken(payload: JwtPayload, expiresIn: string | number = '7d'): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}
