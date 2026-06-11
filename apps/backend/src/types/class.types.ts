import type { MembershipPublic } from './membership.types.js';

export interface ClassRecord {
  id: string;
  discipline_id: string;
  professional_id: string;
  scheduled_at: Date;
  duration_minutes: number;
  capacity: number;
  enrolled_count: number;
  location: string | null;
  notes: string | null;
  is_cancelled: boolean;
  membership_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ClassPublic {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  capacity: number;
  enrolledCount: number;
  location: string | null;
  notes: string | null;
  isCancelled: boolean;
  discipline: {
    id: string;
    name: string;
    level: string;
    durationMinutes: number;
  };
  instructor: {
    id: string;
    firstName: string;
    lastName: string;
  };
  membership: MembershipPublic | null;
}
