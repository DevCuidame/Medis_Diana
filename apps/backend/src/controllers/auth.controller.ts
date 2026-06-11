import type { Request, Response } from 'express';
import { AuthService } from '@services/auth.service.js';
import { UserRepository } from '@repositories/user.repository.js';

// ─── POST /api/auth/register ──────────────────────────────────────────────────
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { user, tokens } = await AuthService.register(req.body);
    res.status(201).json({ success: true, data: { user, tokens } });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { user, tokens } = await AuthService.login(req.body);
    res.status(200).json({ success: true, data: { user, tokens } });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'refreshToken es requerido.' });
      return;
    }
    const tokens = await AuthService.refresh(refreshToken);
    res.status(200).json({ success: true, data: { tokens } });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    if (refreshToken) await AuthService.logout(refreshToken);
    res.status(200).json({ success: true, message: 'Sesión cerrada exitosamente.' });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message });
  }
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
export async function me(req: Request, res: Response): Promise<void> {
  try {
    const full = req.user?.id ? await UserRepository.getPublicById(req.user.id) : null;
    res.status(200).json({ success: true, data: { user: full ?? req.user } });
  } catch {
    res.status(200).json({ success: true, data: { user: req.user } });
  }
}
