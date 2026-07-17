import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import professionalRoutes from './professional.routes.js';
import servicesRoutes from './services.routes.js';
import docServicesRoutes from './docServices.routes.js';
import docAppointmentsRoutes from './docAppointments.routes.js';
import membershipsRoutes from './memberships.routes.js';
import userMembershipsRoutes from './user-memberships.routes.js';
import benefitsRoutes from './benefits.routes.js';
import discountsRoutes from './discounts.routes.js';

const router: Router = Router();

router.use('/', healthRoutes);

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/professionals', professionalRoutes);
router.use('/services/catalog', docServicesRoutes);
router.use('/appointments/diana', docAppointmentsRoutes);
router.use('/', servicesRoutes);
router.use('/memberships', membershipsRoutes);
router.use('/user-memberships', userMembershipsRoutes);
router.use('/benefits', benefitsRoutes);
router.use('/discounts', discountsRoutes);

export default router;
