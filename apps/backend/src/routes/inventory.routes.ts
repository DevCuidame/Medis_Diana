import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import {
  searchInventory,
  listInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '@controllers/inventory.controller.js';

const router: Router = Router();

// Público — búsqueda de catálogo activo (usado por CuidameDoc vía proxy)
router.get('/search', searchInventory);

// Admin — CRUD completo
router.get(   '/',     authenticate, authorize('ADMIN'), listInventory);
router.post(  '/',     authenticate, authorize('ADMIN'), createInventoryItem);
router.patch( '/:id',  authenticate, authorize('ADMIN'), updateInventoryItem);
router.delete('/:id',  authenticate, authorize('ADMIN'), deleteInventoryItem);

export default router;
