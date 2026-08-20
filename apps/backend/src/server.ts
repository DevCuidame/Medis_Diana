import express from 'express';
import { env } from '@config/env';
import { errorHandler } from '@middleware/errorHandler.middleware';
import apiRoutes from '@routes/index';
import { log } from '@utils/logger.util';

export function createServer(): express.Express {
  const app = express();

  // Middleware
  // limit 8mb: el frontend guarda avatares/imágenes de servicio como data URL
  // base64 dentro del body JSON (no multipart) — el default de 100kb rechaza
  // cualquier foto real.
  app.use(express.json({ limit: '8mb' }));
  app.use(express.urlencoded({ extended: true, limit: '8mb' }));

  // CORS
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origin.startsWith('http://localhost:')) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', env.CORS_ORIGIN);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    return next();
  });

  // Routes
  app.use('/api', apiRoutes);

  // 404 Handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  // Error Handler (debe ser el último middleware)
  app.use(errorHandler);

  return app;
}

export function startServer() {
  const app = createServer();

  app.listen(env.PORT, () => {
    log.info(`🚀 Server running at http://localhost:${env.PORT}`);
    log.info(`📡 API available at http://localhost:${env.PORT}/api`);
  });
}
