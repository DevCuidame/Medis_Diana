import type { MembershipType } from './membership.types.js';

export type PaymentMethod = 'cash' | 'wompi' | 'free';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

export interface UserMembershipRecord {
  id: string;
  user_id: string;
  membership_id: string;
  started_at: Date;
  expires_at: Date | null;
  classes_remaining: number | null;
  is_active: boolean;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  created_at: Date;
  updated_at: Date;
  // Joined membership fields
  membership_name?: string;
  membership_type?: MembershipType;
  membership_price?: number;
  membership_benefits?: string[];
  membership_duration_days?: number | null;
  // Joined user fields (admin queries)
  user_name?: string;
  user_email?: string;
}

export interface CategoryCredit {
  total: number;
  used: number;
  remaining: number;
}

export interface UserMembershipPublic {
  id: string;
  userId: string;
  membershipId: string;
  startedAt: string;
  expiresAt: string | null;
  classesRemaining: number | null;
  isActive: boolean;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  // Populated in admin queries
  userName?: string;
  userEmail?: string;
  membership: {
    id: string;
    name: string;
    type: MembershipType;
    price: number;
    benefits: string[];
    durationDays: number | null;
  };
  // Derived
  isExpired: boolean;
  coversFreeClasses: boolean;
  hasClassCredits: boolean;
  discountPercent: number | null;
  sessionsUsed: number;
  // Per-category session tracking (pole, complementary, general)
  categoryCredits: Record<string, CategoryCredit>;
}

export interface PurchaseMembershipDto {
  membershipId: string;
  paymentMethod: 'cash' | 'wompi';
}
