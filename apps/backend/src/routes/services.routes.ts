// ============================================================
// apps/backend/src/routes/services.routes.ts
// Rutas: Gestión de Servicios
// ============================================================
// RESUMEN DE ENDPOINTS:
//
//  OPERATING HOURS
//  GET    /locations/:locationId/hours          → público (horarios de sede)
//  PUT    /locations/:locationId/hours          → ADMIN (upsert horarios)
//
//  ROOMS
//  GET    /locations/:locationId/rooms          → público
//  POST   /rooms                                → ADMIN
//  PATCH  /rooms/:id                            → ADMIN
//
//  SERVICE OFFERS
//  GET    /services/offers                      → público (con filtros)
//  GET    /services/offers/:id                  → público
//  POST   /services/offers                      → ADMIN
//  PATCH  /services/offers/:id                  → ADMIN
//  DELETE /services/offers/:id                  → ADMIN
//
//  BOOKING REQUESTS
//  GET    /services/requests/all                      → ADMIN (inscripciones gratuitas)
//  GET    /services/requests/pending-payment          → ADMIN (inscripciones con pago pendiente)
//  GET    /services/offers/:offerId/requests          → ADMIN
//  GET    /services/my-requests                       → USER autenticado
//  POST   /services/requests                          → USER autenticado
//  PATCH  /services/requests/:id/resolve              → ADMIN
//  PATCH  /services/requests/:id/confirm-payment      → ADMIN (confirmar pago → auto-aprobar)
// ============================================================

import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import {
  getOperatingHours,
  upsertOperatingHours,
  getAllRooms,
  getRoomsByLocation,
  createRoom,
  updateRoom,
  listOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
  listAllBookingRequests,
  listBookingRequests,
  myBookingRequests,
  myCalendarSessions,
  createBookingRequest,
  createBulkBookingRequests,
  resolveBookingRequest,
  listPendingServicePayments,
  confirmServicePayment,
  rejectServicePayment,
  deleteServicePayment,
  setBookingPayment,
} from '@controllers/services.controller.js';
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from '@controllers/location.controller.js';

const router: Router = Router();

// ─── LOCATIONS ───────────────────────────────────────────────
router.get(   '/locations',     getLocations);
router.post(  '/locations',     createLocation);
router.patch( '/locations/:id', updateLocation);
router.delete('/locations/:id', deleteLocation);

// ─── OPERATING HOURS ─────────────────────────────────────────
router.get('/locations/:locationId/hours', getOperatingHours);
router.put('/locations/:locationId/hours', upsertOperatingHours);

// ─── ROOMS ───────────────────────────────────────────────────
router.get(  '/rooms', getAllRooms);
router.get(  '/locations/:locationId/rooms', getRoomsByLocation);
router.post( '/rooms',     createRoom);
router.patch('/rooms/:id', updateRoom);

// ─── SERVICE OFFERS ──────────────────────────────────────────
router.get(   '/services/offers',     listOffers);
router.get(   '/services/offers/:id', getOffer);
router.post(  '/services/offers',     authenticate, authorize('ADMIN'), createOffer);
router.patch( '/services/offers/:id', authenticate, authorize('ADMIN'), updateOffer);
router.delete('/services/offers/:id', authenticate, authorize('ADMIN'), deleteOffer);

// ─── BOOKING REQUESTS ────────────────────────────────────────
router.get(  '/services/requests/all',             authenticate, authorize('ADMIN'), listAllBookingRequests);
router.get(  '/services/requests/pending-payment', authenticate, authorize('ADMIN'), listPendingServicePayments);
router.get(  '/services/offers/:offerId/requests', authenticate, authorize('ADMIN'), listBookingRequests);
router.patch( '/services/requests/:id/resolve',         authenticate, authorize('ADMIN'), resolveBookingRequest);
router.patch( '/services/requests/:id/confirm-payment', authenticate, authorize('ADMIN'), confirmServicePayment);
router.patch( '/services/requests/:id/reject-payment',  authenticate, authorize('ADMIN'), rejectServicePayment);
router.patch( '/services/requests/:id/set-payment',     authenticate, authorize('ADMIN'), setBookingPayment);
router.delete('/services/requests/:id',                 authenticate, authorize('ADMIN'), deleteServicePayment);
router.get(  '/services/my-requests',    authenticate, myBookingRequests);
router.get(  '/services/my-sessions',    authenticate, myCalendarSessions);
router.post( '/services/requests/bulk',  authenticate, createBulkBookingRequests);
router.post( '/services/requests',       authenticate, createBookingRequest);

export default router;
