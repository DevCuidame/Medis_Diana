import { z } from 'zod';

export const categoriaEnum = z.enum([
  'Promoción y Prevención en Salud',
  'Enfermedades No Transmisibles',
  'Sobrepeso y Obesidad',
  'Salud de la Mujer',
  'Salud Mental',
]);

export const modalidadEnum = z.enum(['Grupal', 'Individual']);
export const tipoAtencionEnum = z.enum(['Primera vez', 'Control o seguimiento', 'Urgencia']);

export const DIA_LABELS: Record<string, string> = {
  lun: 'L', mar: 'M', mie: 'X', jue: 'J', vie: 'V', sab: 'S', dom: 'D',
};
export const DIA_NOMBRES: Record<string, string> = {
  lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves',
  vie: 'Viernes', sab: 'Sábado', dom: 'Domingo',
};
export const DIAS_ORDEN = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
// JS getDay(): 0=dom, 1=lun, 2=mar, 3=mie, 4=jue, 5=vie, 6=sab
export const DIA_JS_DAY: Record<string, number> = {
  dom: 0, lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6,
};

const baseSchema = z.object({
  locationId:      z.string().min(1, 'La sede es obligatoria'),
  roomId:          z.string().min(1, 'El espacio es obligatorio'),
  categoria:       categoriaEnum,
  tipoServicio:    z.string().min(1, 'El tipo de servicio es obligatorio'),
  // Schedule
  diasSemana:      z.array(z.string()).min(1, 'Selecciona al menos un día'),
  fechaDesde:      z.string().min(1, 'La fecha de inicio es obligatoria'),
  fechaHasta:      z.string().min(1, 'La fecha de fin es obligatoria'),
  horaInicio:      z.string().min(1, 'La hora de inicio es obligatoria'),
  horaFin:         z.string().min(1, 'La hora de fin es obligatoria'),
  precio:          z.number().min(0, 'El precio no puede ser negativo'),
  // Conditional
  modalidad:       z.preprocess((val) => (val === '' || val === null ? undefined : val), modalidadEnum.optional()) as z.ZodType<'Grupal' | 'Individual' | undefined>,
  instructorId:    z.preprocess((val) => (val === '' || val === null ? undefined : val), z.string().optional()) as z.ZodType<string | undefined>,
  tipoAtencion:    z.preprocess((val) => (val === '' || val === null ? undefined : val), tipoAtencionEnum.optional()) as z.ZodType<'Primera vez' | 'Control o seguimiento' | 'Urgencia' | undefined>,
  capacidad:       z.number().optional(),
});

export const servicioSchema = baseSchema.superRefine((data, ctx) => {
  if (!data.modalidad) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La modalidad es obligatoria', path: ['modalidad'] });
  }
  if (!data.instructorId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El médico responsable es obligatorio', path: ['instructorId'] });
  }
  if (!data.tipoAtencion) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El tipo de atención es obligatorio', path: ['tipoAtencion'] });
  }
  if (data.modalidad === 'Grupal') {
    if (!data.capacidad || data.capacidad < 2 || data.capacidad > 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La capacidad grupal debe ser entre 2 y 20', path: ['capacidad'] });
    }
  }

  if (data.horaInicio && data.horaFin) {
    const [hI, mI] = data.horaInicio.split(':').map(Number);
    const [hF, mF] = data.horaFin.split(':').map(Number);
    if (!isNaN(hI) && !isNaN(hF) && hI * 60 + (mI || 0) >= hF * 60 + (mF || 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La hora de fin debe ser posterior a la de inicio', path: ['horaFin'] });
    }
  }

  if (data.fechaDesde && data.fechaHasta && data.fechaDesde > data.fechaHasta) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La fecha de fin debe ser igual o posterior a la de inicio', path: ['fechaHasta'] });
  }
});

export type ServicioFormValues = z.infer<typeof baseSchema>;

/** Generate all dates (ISO strings) matching the selected days within the range */
export function generateOccurrences(
  diasSemana: string[],
  fechaDesde: string,
  fechaHasta: string,
  horaInicio: string,
): Date[] {
  const targetDays = new Set(diasSemana.map(d => DIA_JS_DAY[d]));
  const from = new Date(`${fechaDesde}T00:00:00`);
  const to   = new Date(`${fechaHasta}T23:59:59`);
  const [h, m] = horaInicio.split(':').map(Number);
  const results: Date[] = [];

  const cur = new Date(from);
  while (cur <= to && results.length < 365) {
    if (targetDays.has(cur.getDay())) {
      const occ = new Date(cur);
      occ.setHours(h, m, 0, 0);
      results.push(occ);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return results;
}
