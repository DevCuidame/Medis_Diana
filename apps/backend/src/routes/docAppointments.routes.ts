import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import { getOpiMedAppointments, createOpiMedAppointment, getOpiMedPatients } from '@controllers/docAppointments.controller.js';

const router = Router();

router.get('/patients', authenticate, authorize('ADMIN'), getOpiMedPatients);
router.get('/', authenticate, authorize('ADMIN'), getOpiMedAppointments);
router.post('/', authenticate, authorize('ADMIN'), createOpiMedAppointment);

export default router;
