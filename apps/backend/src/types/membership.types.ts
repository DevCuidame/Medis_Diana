export type MembershipType = 'monthly' | 'per_class' | 'private' | 'annual' | 'pack';

export interface MembershipRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: MembershipType;
  price: number;
  currency: string;
  duration_days: number | null;
  max_classes: number | null;
  benefits: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MembershipPublic {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: MembershipType;
  price: number;
  currency: string;
  durationDays: number | null;
  maxClasses: number | null;
  benefits: string[];
  isActive: boolean;
}

export interface CreateMembershipDto {
  code: string;
  name: string;
  description?: string | null;
  type: MembershipType;
  price: number;
  currency?: string;
  durationDays?: number | null;
  benefits?: string[];
  isActive?: boolean;
}

export type UpdateMembershipDto = Partial<CreateMembershipDto>;
