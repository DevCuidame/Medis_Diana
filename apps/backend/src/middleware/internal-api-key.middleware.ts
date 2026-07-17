import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { env } from '@config/env.js';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function requireInternalApiKey(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['x-internal-api-key'];
  const provided = typeof header === 'string' ? header : '';

  if (!env.DIANA_INTERNAL_API_KEY || !safeEqual(provided, env.DIANA_INTERNAL_API_KEY)) {
    res.status(401).json({ success: false, error: 'API key interna inválida o ausente.' });
    return;
  }

  next();
}
