import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import professionalRoutes from './professional.routes.js';
import classesRoutes from './classes.routes.js';
import servicesRoutes from './services.routes.js';
import membershipsRoutes from './memberships.routes.js';
import userMembershipsRoutes from './user-memberships.routes.js';
import benefitsRoutes from './benefits.routes.js';

const router: Router = Router();

router.use('/', healthRoutes);

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/professionals', professionalRoutes);
router.use('/classes', classesRoutes);
router.use('/', servicesRoutes);
router.use('/memberships', membershipsRoutes);
router.use('/user-memberships', userMembershipsRoutes);
router.use('/benefits', benefitsRoutes);

export default router;
