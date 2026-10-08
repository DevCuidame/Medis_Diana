import { z } from 'zod';

export const espacioResourceSchema = z.object({
  name: z.string().min(2, 'El recurso debe tener un nombre descriptivo'),
  qty: z.number().min(1, 'La cantidad debe ser al menos 1')
});

export const espacioSchema = z.object({
  locationId: z.string().min(1, 'Debe seleccionar una sede'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  capacity: z.number().min(1, 'La capacidad mínima es de 1 persona'),
  description: z.string().optional(),
  isActive: z.boolean(),
  resources: z.array(espacioResourceSchema)
});

export type EspacioFormValues = z.infer<typeof espacioSchema>;
