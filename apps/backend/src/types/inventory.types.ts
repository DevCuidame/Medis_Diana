export interface InventoryItemRecord {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  quantity: number;
  min_stock: number;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryItemPublic {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  quantity: number;
  minStock: number;
  notes: string | null;
  isActive: boolean;
}

export interface CreateInventoryItemDto {
  name: string;
  category: string;
  unit: string;
  price: number;
  quantity?: number;
  minStock?: number;
  notes?: string | null;
  isActive?: boolean;
}

export type UpdateInventoryItemDto = Partial<CreateInventoryItemDto>;

export interface InventorySearchFilters {
  search?: string;
  category?: string;
}
