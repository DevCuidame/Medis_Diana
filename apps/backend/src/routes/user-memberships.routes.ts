import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import {
  getMyActiveMembership,
  getMyActiveInscription,
  getMyMembershipHistory,
  purchaseMembership,
  getActiveMemberships,
  getPendingMemberships,
  confirmPayment,
  rejectPlan,
  deletePlan,
} from '@controllers/user-memberships.controller.js';

const router: Router = Router();

// User routes
router.get('/me',             authenticate, getMyActiveMembership);
router.get('/me/inscription', authenticate, getMyActiveInscription);
router.get('/history',        authenticate, getMyMembershipHistory);
router.post('/',       authenticate, purchaseMembership);

// Admin routes
router.get('/active-all',     authenticate, authorize('ADMIN'), getActiveMemberships);
router.get('/pending',        authenticate, authorize('ADMIN'), getPendingMemberships);
router.patch('/:id/confirm',  authenticate, authorize('ADMIN'), confirmPayment);
router.patch('/:id/reject',   authenticate, authorize('ADMIN'), rejectPlan);
router.delete('/:id',         authenticate, authorize('ADMIN'), deletePlan);

export default router;
