import { Router } from 'express';
// import { authenticate, authorize } from '../middlewares/auth.middleware';
import type { Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();

// This file defines the RESTful routes for the Services Management Module
// The logic will be wired to the respective controllers.

/**
 * RUTAS DE APOYO (Poblar formularios Frontend)
 */
// router.get('/instructors', authenticate, authorize('ADMIN'), getActiveInstructors);
// router.get('/locations/:locationId/rooms', authenticate, authorize('ADMIN'), getRoomsByLocation);

/**
 * RUTAS DEL FLUJO PRINCIPAL DE SERVICIOS
 */
// router.post('/locations', authenticate, authorize('ADMIN'), createLocation);
// router.post('/rooms', authenticate, authorize('ADMIN'), createRoom);
// router.post('/services', authenticate, authorize('ADMIN'), createService);

/**
 * RUTAS DE RESERVA Y APROBACIÓN
 */
// router.get('/services', authenticate, listAvailableServices);
// router.post('/services/:serviceId/book', authenticate, authorize('USER'), requestBooking);
// router.get('/bookings/pending', authenticate, authorize('ADMIN'), listPendingBookings);
// router.patch('/bookings/:bookingId/resolve', authenticate, authorize('ADMIN'), resolveBookingStatus);

export default router;
