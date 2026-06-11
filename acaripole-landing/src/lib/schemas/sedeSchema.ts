import { z } from 'zod';

export const scheduleBlockSchema = z.object({
  openTime: z.string().min(1, "Hora de apertura requerida"),
  closeTime: z.string().min(1, "Hora de cierre requerida"),
}).refine(data => data.openTime < data.closeTime, {
  message: "La apertura debe ser antes del cierre",
  path: ["closeTime"]
});

export const dayScheduleSchema = z.object({
  isOpen: z.boolean(),
  blocks: z.array(scheduleBlockSchema),
}).refine(data => !data.isOpen || data.blocks.length > 0, {
  message: "Agrega al menos un bloque horario o marca el día como cerrado",
  path: ["blocks"]
});

export const sedeSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  address: z.string().min(5, "La dirección debe ser más descriptiva"),
  city: z.string().min(2, "Ciudad es requerida"),
  phone: z.string().optional(),
  email: z.string().email("Debe ser un email válido").optional().or(z.literal('')),
  isActive: z.boolean(),
  operatingHours: z.object({
    monday: dayScheduleSchema,
    tuesday: dayScheduleSchema,
    wednesday: dayScheduleSchema,
    thursday: dayScheduleSchema,
    friday: dayScheduleSchema,
    saturday: dayScheduleSchema,
    sunday: dayScheduleSchema,
  })
});

export type SedeFormValues = z.infer<typeof sedeSchema>;
export type ScheduleBlock = z.infer<typeof scheduleBlockSchema>;
export type DaySchedule = z.infer<typeof dayScheduleSchema>;
