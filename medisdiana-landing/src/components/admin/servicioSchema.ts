import { z } from 'zod';

export const RIPS_GRUPO_SERVICIO = ['01', '02', '03', '04', '05', '06'] as const;

export const RIPS_MODALIDAD = [
  '01 INTRAMURAL',
  '02 EXTRAMURAL DOMICILIARIA',
  '03 EXTRAMURAL UNIDAD MOVIL',
  '04 TELEMEDICINA INTERACTIVA',
  '05 TELEMEDICINA NO INTERACTIVA',
  '06 TELESALUD',
  '08 EXTRAMURAL CENTRO DE ENCUENTRO',
  '09 EXTRAMURAL OTROS'
] as const;

export const tipoAtencionEnum = z.enum(['Primera vez', 'Control o seguimiento', 'Urgencia']);

export const DIA_LABELS: Record<string, string> = {
  lun: 'L', mar: 'M', mie: 'X', jue: 'J', vie: 'V', sab: 'S', dom: 'D',
};
export const DIA_NOMBRES: Record<string, string> = {
  lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves',
  vie: 'Viernes', sab: 'Sábado', dom: 'Domingo',
};
export const DIAS_ORDEN = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
export const DIA_JS_DAY: Record<string, number> = {
  dom: 0, lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6,
};

const baseSchema = z.object({
  // RIPS Fields
  serviceName: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  categoryGroup: z.enum(RIPS_GRUPO_SERVICIO, { required_error: 'El grupo de servicio es obligatorio' }),
  subcategoryGroup: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  cups: z.string().optional(), // CUPS
  modality: z.array(z.string()).min(1, 'Selecciona al menos una modalidad'),
  isActive: z.boolean().default(true),
  basePrice: z.number().min(0, 'El precio no puede ser negativo'),
  controlPrice: z.preprocess(
    (v) => (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
    z.number().min(0, 'El precio no puede ser negativo').optional()
  ),
  imageUrl: z.string().optional(),
  preparationInstructions: z.string().optional(),
  genderRestriction: z.string().optional(),
  risks: z.string().optional(),
  contraindications: z.string().optional(),

  // Scheduling and offer logic (Service Offer related)
  locationId:      z.string().min(1, 'La sede es obligatoria'),
  roomId:          z.string().optional(),
  instructorId:    z.string().optional(),
  tipoAtencion:    z.preprocess((val) => (val === '' || val === null ? undefined : val), tipoAtencionEnum.optional()),
  durationMinutes: z.number().min(5, 'La duración mínima es de 5 minutos').default(30),
  capacidad:       z.number().optional(),
});

export const servicioSchema = baseSchema.superRefine((data, ctx) => {
  const isEscapeGroup = data.categoryGroup === '06';

  if (!isEscapeGroup) {
    if (!data.subcategoryGroup) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El subgrupo es obligatorio para este grupo', path: ['subcategoryGroup'] });
    }
    if (!data.category) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La categoría es obligatoria para este grupo', path: ['category'] });
    }
    if (!data.subcategory) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La subcategoría es obligatoria para este grupo', path: ['subcategory'] });
    }
    if (!data.cups || !/^[A-Za-z0-9]{6}$/.test(data.cups)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El código CUPS es obligatorio y debe tener 6 caracteres alfanuméricos', path: ['cups'] });
    }
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
