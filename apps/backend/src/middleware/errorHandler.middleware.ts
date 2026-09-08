import { Request, Response, NextFunction } from 'express';
import { AppError, InternalServerError } from '@utils/errors.util';
import { log } from '@utils/logger.util';

export function errorHandler(
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof AppError) {
    log.error(`[${error.statusCode}] ${error.message}`);
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
  }

  if ((error as any).type === 'entity.too.large') {
    log.error('[413] Payload too large');
    return res.status(413).json({
      success: false,
      error: 'La imagen es demasiado grande. Máximo 8MB.',
    });
  }

  log.error('Unexpected error:', error);
  const internalError = new InternalServerError();
  return res.status(internalError.statusCode).json({
    success: false,
    error: internalError.message,
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
