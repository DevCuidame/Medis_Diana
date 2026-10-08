import { z } from 'zod';

export const gastoSchema = z.object({
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres'),
  amount: z.number().min(0, 'El monto no puede ser negativo'),
  category: z.string().min(1, 'La categoría es obligatoria'),
  expenseDate: z.string().min(1, 'La fecha es obligatoria'),
});

export type GastoFormValues = z.infer<typeof gastoSchema>;
