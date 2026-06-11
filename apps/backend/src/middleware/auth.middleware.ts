import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '@services/auth.service.js';
import type { UserRole } from '../types/auth.types.js';

// ─── Augment Express Request ──────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: UserRole };
    }
  }
}

// ─── Authenticate: verifica el JWT Bearer ────────────────────────────────────
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Token de acceso requerido.' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = AuthService.verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err: any) {
    res.status(err.statusCode ?? 401).json({ success: false, error: err.message });
  }
}

// ─── Authorize: permite solo ciertos roles ────────────────────────────────────
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'No autenticado.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'No tienes permiso para este recurso.' });
      return;
    }
    next();
  };
}
