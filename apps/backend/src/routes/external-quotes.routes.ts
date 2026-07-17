import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import { requireInternalApiKey } from '@middleware/internal-api-key.middleware.js';
import {
  createExternalQuote,
  listExternalQuotes,
  confirmExternalQuote,
  rejectExternalQuote,
} from '@controllers/external-quotes.controller.js';

const router: Router = Router();

// Server-to-server — protegido por API key compartida, no por JWT de usuario
router.post('/', requireInternalApiKey, createExternalQuote);

// Admin
router.get(   '/',            authenticate, authorize('ADMIN'), listExternalQuotes);
router.patch( '/:id/confirm', authenticate, authorize('ADMIN'), confirmExternalQuote);
router.patch( '/:id/reject',  authenticate, authorize('ADMIN'), rejectExternalQuote);

export default router;
