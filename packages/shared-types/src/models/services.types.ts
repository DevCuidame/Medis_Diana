// ============================================================
// packages/shared-types/src/models/services.types.ts
// Contratos compartidos para el módulo Gestión de Servicios
// ============================================================

// ─── ENUMS ───────────────────────────────────────────────────

export type DayOfWeek =
  | 'monday' | 'tuesday' | 'wednesday'
  | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type OfferType = 'appointment' | 'open_consultation' | 'workshop' | 'event';

export type OfferStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export type BookingRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

// ─── OPERATING HOURS ─────────────────────────────────────────

export interface OperatingHour {
  id: string;
  locationId: string;
  day: DayOfWeek;
  opensAt: string;    // 'HH:mm'
  closesAt: string;   // 'HH:mm'
}

export interface UpsertOperatingHourPayload {
  day: DayOfWeek;
  opensAt: string;
  closesAt: string;
}

// ─── LOCATION (extended) ─────────────────────────────────────

export interface LocationSummary {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  operatingHours: OperatingHour[];
}

// ─── ROOM (extended) ─────────────────────────────────────────

export interface RoomResource {
  name: string;
  qty: number;
}

export interface RoomPublic {
  id: string;
  locationId: string;
  name: string;
  capacity: number;
  description: string | null;
  resources: RoomResource[];
  isActive: boolean;
}

export interface CreateRoomPayload {
  locationId: string;
  name: string;
  capacity: number;
  description?: string;
  resources?: RoomResource[];
}

export interface UpdateRoomPayload {
  name?: string;
  capacity?: number;
  description?: string;
  resources?: RoomResource[];
  isActive?: boolean;
}

// ─── SERVICE OFFER ───────────────────────────────────────────

export interface ServiceOfferPublic {
  id: string;
  title: string;
  description: string | null;
  offerType: OfferType;
  status: OfferStatus;
  scheduledAt: string;        // ISO 8601
  durationMinutes: number;
  capacity: number;
  enrolledCount: number;
  price: number | null;
  currency: string;
  // Relations (joined)
  location: { id: string; name: string };
  room: { id: string; name: string; capacity: number } | null;
  professional: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  discipline: {
    id: string;
    name: string;
    level: string;
  } | null;
}

export interface CreateServiceOfferPayload {
  locationId: string;
  roomId?: string;
  offerType: OfferType;
  title: string;
  description?: string;
  professionalId?: string;
  disciplineId?: string;
  capacity: number;
  durationMinutes: number;
  scheduledAt: string;    // ISO 8601
  price?: number;
  currency?: string;
}

export interface UpdateServiceOfferPayload {
  title?: string;
  description?: string;
  roomId?: string;
  professionalId?: string;
  disciplineId?: string;
  capacity?: number;
  durationMinutes?: number;
  scheduledAt?: string;
  price?: number;
  currency?: string;
  status?: OfferStatus;
}

export interface ServiceOffersFilter {
  locationId?: string;
  offerType?: OfferType;
  status?: OfferStatus;
  from?: string;    // ISO date
  to?: string;      // ISO date
  page?: number;
  limit?: number;
}

// ─── BOOKING REQUEST ─────────────────────────────────────────

export interface BookingRequestPublic {
  id: string;
  offerId: string;
  offerTitle: string;
  scheduledAt: string;
  durationMinutes?: number;
  offerPrice?: number;
  offerType?: string;
  locationName?: string;
  profFirstName?: string;
  profLastName?: string;
  status: BookingRequestStatus;
  user: { id: string; firstName: string; lastName: string; email: string };
  resolvedBy: string | null;
  resolvedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  sessionCount?: number;
}

export interface CreateBookingRequestPayload {
  offerId: string;
}

export interface ResolveBookingRequestPayload {
  status: 'approved' | 'rejected';
  rejectReason?: string;  // requerido si status === 'rejected'
}

