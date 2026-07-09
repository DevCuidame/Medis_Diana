// ============================================================
// apps/backend/src/routes/discounts.routes.ts
// Rutas: Descuentos y Promociones
// ============================================================
// GET    /discounts/active   → público (promos automáticas aplicables)
// POST   /discounts/validate → público (preview de código/promo, sin canjear)
// GET    /discounts          → ADMIN
// POST   /discounts          → ADMIN
// PATCH  /discounts/:id      → ADMIN
// DELETE /discounts/:id      → ADMIN
// ============================================================

import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import {
  listDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  listActiveDiscounts,
  validateDiscount,
  listSpecialties,
} from '@controllers/discounts.controller.js';

const router: Router = Router();

router.get(   '/active',      listActiveDiscounts);
router.post(  '/validate',    validateDiscount);
router.get(   '/specialties', listSpecialties);
router.get(   '/',         authenticate, authorize('ADMIN'), listDiscounts);
router.post(  '/',         authenticate, authorize('ADMIN'), createDiscount);
router.patch( '/:id',      authenticate, authorize('ADMIN'), updateDiscount);
router.delete('/:id',      authenticate, authorize('ADMIN'), deleteDiscount);

export default router;
