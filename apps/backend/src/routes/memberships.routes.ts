import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import {
  listMemberships,
  listActiveMemberships,
  getMembership,
  createMembership,
  updateMembership,
  deleteMembership,
} from '@controllers/memberships.controller.js';

const router: Router = Router();

// Público — solo activas (para usuarios)
router.get('/active', listActiveMemberships);

// Público con id
router.get('/:id', getMembership);

// Admin — todas (activas e inactivas)
router.get('/', authenticate, authorize('ADMIN'), listMemberships);

// Admin — CRUD
router.post(  '/',    authenticate, authorize('ADMIN'), createMembership);
router.patch( '/:id', authenticate, authorize('ADMIN'), updateMembership);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteMembership);

export default router;
