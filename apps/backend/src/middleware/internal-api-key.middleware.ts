import type { Request, Response, NextFunction } from 'express';
import { env } from '@config/env';

export function requireInternalApiKey(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers['x-internal-api-key'];

  if (!env.DIANA_INTERNAL_API_KEY || provided !== env.DIANA_INTERNAL_API_KEY) {
    res.status(401).json({ success: false, error: 'API key interna inválida o ausente.' });
    return;
  }

  next();
}
