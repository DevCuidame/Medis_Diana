import type { ClassPublic } from './class.types.js';

export interface BookingRecord {
  id: string;
  class_id: string;
  user_id: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  created_at: Date;
  updated_at: Date;
}

export interface BookingPublic {
  id: string;
  status: BookingRecord['status'];
  createdAt: string;
  classInfo: ClassPublic;
}
