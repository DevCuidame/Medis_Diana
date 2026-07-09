import { ProfessionalRepository } from '@repositories/professional.repository.js'
import { UserRepository } from '@repositories/user.repository.js'
import { hashPassword } from '@utils/index.js'
import { pool } from '@config/database.js'
import type {
  ProfessionalPublic,
  CreateProfessionalDTO,
  UpdateProfessionalDTO,
  ProfessionalStatus,
  ProfessionalStats,
} from '../types/professional.types.js'
import type { UserPublic, UserRole } from '../types/auth.types.js'

export const ProfessionalService = {

  async list(): Promise<ProfessionalPublic[]> {
    return ProfessionalRepository.list()
  },

  async getById(id: string): Promise<ProfessionalPublic> {
    const pro = await ProfessionalRepository.findById(id)
    if (!pro) throw Object.assign(new Error('Profesional no encontrado.'), { statusCode: 404 })
    return pro
  },

  async create(dto: CreateProfessionalDTO & { role?: UserRole }): Promise<ProfessionalPublic | UserPublic> {
    const exists = await UserRepository.emailExists(dto.email)
    if (exists) throw Object.assign(new Error('El email ya está registrado.'), { statusCode: 409 })

    const idNumberTaken = await UserRepository.idNumberExists(dto.idNumber)
    if (idNumberTaken) throw Object.assign(new Error('El número de documento ya está registrado.'), { statusCode: 409 })

    if (!/^\d+$/.test(dto.idNumber)) {
      throw Object.assign(new Error('El número de documento debe contener solo dígitos.'), { statusCode: 400 })
    }

    if (!dto.role || dto.role === 'PROFESSIONAL') {
      if (!dto.medicalRegistrationNumber || !dto.sisproUsername || !dto.sisproPassword) {
        throw Object.assign(new Error('Registro Médico, Usuario SISPRO y Contraseña SISPRO son obligatorios para profesionales.'), { statusCode: 400 })
      }
    }

    const passwordHash = hashPassword(dto.password)
    if (dto.role && dto.role !== 'PROFESSIONAL') {
      return UserRepository.create({ ...dto, role: dto.role, passwordHash })
    }
    return ProfessionalRepository.create({ ...dto, passwordHash })
  },

  async update(id: string, dto: UpdateProfessionalDTO): Promise<ProfessionalPublic> {
    const current = await UserRepository.findById(id)
    if (!current) throw Object.assign(new Error('Usuario no encontrado.'), { statusCode: 404 })

    if (dto.email !== undefined) {
      const emailTaken = await UserRepository.emailExists(dto.email, id)
      if (emailTaken) throw Object.assign(new Error('El email ya está registrado.'), { statusCode: 409 })
    }

    if (dto.idNumber !== undefined) {
      if (!/^\d+$/.test(dto.idNumber)) {
        throw Object.assign(new Error('El número de documento debe contener solo dígitos.'), { statusCode: 400 })
      }
      const idTaken = await UserRepository.idNumberExists(dto.idNumber, id)
      if (idTaken) throw Object.assign(new Error('El número de documento ya está registrado.'), { statusCode: 409 })
    }

    const effectiveRole = dto.role ?? current.role
    if (effectiveRole === 'PROFESSIONAL') {
      if (!dto.medicalRegistrationNumber || !dto.sisproUsername) {
        throw Object.assign(new Error('Registro Médico y Usuario SISPRO son obligatorios para profesionales.'), { statusCode: 400 })
      }
    }

    if (current.role === 'PROFESSIONAL' && effectiveRole !== 'PROFESSIONAL') {
      const { rows } = await pool.query(
        `SELECT COUNT(*) AS cnt FROM service_offers WHERE professional_id = $1 AND status != 'cancelled'`,
        [id]
      )
      if (parseInt(rows[0].cnt, 10) > 0) {
        throw Object.assign(new Error('Este profesional tiene servicios activos asignados. Elimina o reasigna los servicios antes de cambiar su rol.'), { statusCode: 409 })
      }
    }

    const updated = await ProfessionalRepository.update(id, dto)
    if (!updated) throw Object.assign(new Error('Profesional no encontrado.'), { statusCode: 404 })
    return updated
  },

  async deactivate(id: string): Promise<void> {
    const ok = await ProfessionalRepository.deactivate(id)
    if (!ok) throw Object.assign(new Error('Profesional no encontrado.'), { statusCode: 404 })
  },

  async updateStatus(id: string, status: ProfessionalStatus): Promise<void> {
    const VALID: ProfessionalStatus[] = ['available', 'in_session', 'offline']
    if (!VALID.includes(status)) {
      throw Object.assign(new Error('Estado inválido.'), { statusCode: 400 })
    }
    const ok = await ProfessionalRepository.updateStatus(id, status)
    if (!ok) throw Object.assign(new Error('Profesional no encontrado.'), { statusCode: 404 })
  },

  async getStats(): Promise<ProfessionalStats> {
    return ProfessionalRepository.getStats()
  },
}
