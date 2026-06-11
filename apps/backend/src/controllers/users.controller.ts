import type { Request, Response } from 'express'
import { UserRepository } from '@repositories/user.repository.js'
import { hashPassword } from '@utils/index.js'

export async function listUsers(_req: Request, res: Response): Promise<void> {
  try {
    const users = await UserRepository.list()
    res.status(200).json({ success: true, data: { users } })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { password, ...rest } = req.body ?? {}

    if (password) {
      const passwordHash = hashPassword(password)
      await UserRepository.updatePassword(id, passwordHash)
    }

    const updated = await UserRepository.update(id, rest)
    if (!updated) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' })
      return
    }

    res.status(200).json({ success: true, data: { user: updated } })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const ok = await UserRepository.delete(id)
    if (!ok) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' })
      return
    }
    res.status(200).json({ success: true, message: 'Usuario eliminado.' })
  } catch (err: any) {
    if (err.code === '23503_instructor') {
      res.status(409).json({ success: false, error: err.message })
      return
    }
    if (err.code === '23503') {
      res.status(409).json({ success: false, error: 'No se puede eliminar el usuario porque tiene registros asociados.' })
      return
    }
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}