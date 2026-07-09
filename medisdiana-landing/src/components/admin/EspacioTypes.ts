export interface EspacioResource {
  name: string;
  qty: number;
}

export interface Espacio {
  id: string;
  locationId: string;
  name: string;
  capacity: number;
  description: string;
  resources: EspacioResource[];
  isActive: boolean;
}

export type ModalEspacioState = 
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; espacio: Espacio }
  | { type: 'view'; espacio: Espacio }
  | { type: 'delete'; espacio: Espacio };
