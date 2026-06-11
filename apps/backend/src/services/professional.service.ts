import { ProfessionalRepository } from '@repositories/professional.repository.js'
import { UserRepository } from '@repositories/user.repository.js'
import { hashPassword } from '@utils/index.js'
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

    const passwordHash = hashPassword(dto.password)
    if (dto.role && dto.role !== 'PROFESSIONAL') {
      return UserRepository.create({ ...dto, role: dto.role, passwordHash })
    }
    return ProfessionalRepository.create({ ...dto, passwordHash })
  },

  async update(id: string, dto: UpdateProfessionalDTO): Promise<ProfessionalPublic> {
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
