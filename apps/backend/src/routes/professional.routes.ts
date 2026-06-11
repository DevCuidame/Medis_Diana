import { Router } from 'express'
import {
  listProfessionals,
  getStats,
  getProfessional,
  checkAvailability,
  getSchedule,
  replaceSchedule,
  createProfessional,
  updateProfessional,
  deleteProfessional,
  updateStatus,
} from '@controllers/professional.controller.js'
import { authenticate, authorize } from '@middleware/auth.middleware.js'

const router: Router = Router()

// Public (authenticated users can see the list — bypassed in dev)
router.get('/',                    listProfessionals)
router.get('/stats',               authenticate, authorize('ADMIN'), getStats)
router.get('/:id/availability',    checkAvailability)
router.get('/:id/schedule',        authenticate, getSchedule)
router.put('/:id/schedule',        authenticate, authorize('ADMIN'), replaceSchedule)
router.get('/:id',                 authenticate, getProfessional)

// Admin-only mutations
router.post('/',             authenticate, authorize('ADMIN'), createProfessional)
router.put('/:id',           authenticate, authorize('ADMIN'), updateProfessional)
router.delete('/:id',        authenticate, authorize('ADMIN'), deleteProfessional)
router.patch('/:id/status',  authenticate, authorize('ADMIN'), updateStatus)

export default router
