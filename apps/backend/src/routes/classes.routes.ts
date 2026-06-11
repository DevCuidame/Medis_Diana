import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { listUpcoming, getUserBookings, createBooking, getClassOptions, createClass } from '../controllers/classes.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router: ExpressRouter = Router();

// Public/-ish endpoints
router.get('/upcoming', listUpcoming);

// Create class options & action (should ideally be admin-only, but using authenticate for now)
router.get('/options', authenticate, getClassOptions);
router.post('/', authenticate, createClass);

// Protected endpoints for users
router.get('/my-bookings', authenticate, getUserBookings);
router.post('/book', authenticate, createBooking);

export default router;
