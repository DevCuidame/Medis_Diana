import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import { listBenefits, createBenefit, updateBenefit, deleteBenefit } from '@controllers/benefits.controller.js';

const router: Router = Router();

// Public/auth: list benefits (active only via ?active=true, all for admin)
router.get('/',        authenticate, listBenefits);
router.post('/',       authenticate, authorize('ADMIN'), createBenefit);
router.patch('/:id',   authenticate, authorize('ADMIN'), updateBenefit);
router.delete('/:id',  authenticate, authorize('ADMIN'), deleteBenefit);

export default router;
