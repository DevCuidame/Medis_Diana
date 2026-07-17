import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import { getDianaAppointments, createDianaAppointment, getDianaPatients } from '@controllers/docAppointments.controller.js';

const router = Router();

router.get('/patients', authenticate, authorize('ADMIN'), getDianaPatients);
router.get('/', authenticate, authorize('ADMIN'), getDianaAppointments);
router.post('/', authenticate, authorize('ADMIN'), createDianaAppointment);

export default router;
