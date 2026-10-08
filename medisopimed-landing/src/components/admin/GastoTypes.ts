import type { GastoFormValues } from '../../lib/schemas/gastoSchema';

export type Gasto = GastoFormValues & { id: string };

export type ModalGastoState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; gasto: Gasto }
  | { type: 'delete'; gasto: Gasto };
