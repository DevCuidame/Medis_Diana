// ============================================================
// packages/shared-types/src/models/discounts.types.ts
// Contratos compartidos para el módulo Descuentos y Promociones
// ============================================================

export type DiscountType = 'percentage' | 'fixed_amount' | 'buy_x_get_y';

export interface DiscountPublic {
  id: string;
  name: string;
  type: DiscountType;
  value: number | null;
  buyQty: number | null;
  payQty: number | null;
  code: string | null;
  specialtyId: string | null;
  specialtyName: string | null;
  startsAt: string | null;
  endsAt: string | null;
  maxTotalUses: number | null;
  maxUsesPerPatient: number | null;
  totalUsesCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateDiscountPayload {
  name: string;
  type: DiscountType;
  value?: number;
  buyQty?: number;
  payQty?: number;
  code?: string;
  specialtyId?: string;
  startsAt?: string;
  endsAt?: string;
  maxTotalUses?: number;
  maxUsesPerPatient?: number;
}

export interface UpdateDiscountPayload extends Partial<CreateDiscountPayload> {
  isActive?: boolean;
}

export interface DiscountResolution {
  valid: boolean;
  discount: DiscountPublic | null;
  pricePerSession: number;
  originalTotal: number;
  discountedTotal: number;
  amountSaved: number;
  error?: string;
}
