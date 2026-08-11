import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import { listExpenses, createExpense, updateExpense, deleteExpense } from '@controllers/expense.controller.js';

const router: Router = Router();

router.get(   '/',    authenticate, authorize('ADMIN'), listExpenses);
router.post(  '/',    authenticate, authorize('ADMIN'), createExpense);
router.patch( '/:id', authenticate, authorize('ADMIN'), updateExpense);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteExpense);

export default router;
