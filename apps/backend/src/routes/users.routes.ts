import { Router } from 'express' // force restart
import { listUsers, updateUser, deleteUser } from '@controllers/users.controller.js'
import { authenticate, authorize } from '@middleware/auth.middleware.js'

const router: Router = Router()

router.get('/', authenticate, authorize('ADMIN'), listUsers)
router.put('/:id', authenticate, authorize('ADMIN'), updateUser)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteUser)

export default router