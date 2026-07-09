import type { SedeFormValues } from '../../lib/schemas/sedeSchema';

export type Sede = SedeFormValues & { id: string };

export type ModalState = 
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; sede: Sede }
  | { type: 'view'; sede: Sede }
  | { type: 'delete'; sede: Sede };
