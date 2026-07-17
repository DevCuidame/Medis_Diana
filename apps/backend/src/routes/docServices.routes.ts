import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import { getCatalog, createCatalogService, deleteCatalogService } from '@controllers/docServices.controller.js';

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), getCatalog);
router.post('/', authenticate, authorize('ADMIN'), createCatalogService);
router.delete('/:profServiceId', authenticate, authorize('ADMIN'), deleteCatalogService);

export default router;
