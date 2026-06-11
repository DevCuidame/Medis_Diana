// ============================================================
// apps/frontend/src/app/modules/services/services/
// services-management.service.ts
// Servicio Angular: Gestión de Servicios
// ============================================================

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import type {
  ServiceOfferPublic,
  BookingRequestPublic,
  OperatingHour,
  RoomPublic,
  CreateServiceOfferPayload,
  UpdateServiceOfferPayload,
  CreateRoomPayload,
  UpsertOperatingHourPayload,
  ServiceOffersFilter,
  PaginatedResponse,
  ResolveBookingRequestPayload,
} from '@acaripole/shared-types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class ServicesManagementService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  // ─── OPERATING HOURS ───────────────────────────────────────

  getOperatingHours(locationId: string): Observable<OperatingHour[]> {
    return this.http
      .get<ApiResponse<{ hours: OperatingHour[] }>>(`${this.base}/locations/${locationId}/hours`)
      .pipe(map((r: any) => r.data.hours));
  }

  upsertOperatingHours(
    locationId: string,
    hours: UpsertOperatingHourPayload[]
  ): Observable<OperatingHour[]> {
    return this.http
      .put<ApiResponse<{ hours: OperatingHour[] }>>(
        `${this.base}/locations/${locationId}/hours`,
        { hours }
      )
      .pipe(map((r: any) => r.data.hours));
  }

  // ─── ROOMS ─────────────────────────────────────────────────

  getRoomsByLocation(locationId: string): Observable<RoomPublic[]> {
    return this.http
      .get<ApiResponse<{ rooms: RoomPublic[] }>>(`${this.base}/locations/${locationId}/rooms`)
      .pipe(map((r: any) => r.data.rooms));
  }

  createRoom(payload: CreateRoomPayload): Observable<RoomPublic> {
    return this.http
      .post<ApiResponse<{ room: RoomPublic }>>(`${this.base}/rooms`, payload)
      .pipe(map((r: any) => r.data.room));
  }

  updateRoom(id: string, payload: Partial<CreateRoomPayload>): Observable<RoomPublic> {
    return this.http
      .patch<ApiResponse<{ room: RoomPublic }>>(`${this.base}/rooms/${id}`, payload)
      .pipe(map((r: any) => r.data.room));
  }

  // ─── SERVICE OFFERS ────────────────────────────────────────

  listOffers(
    filter: ServiceOffersFilter = {}
  ): Observable<PaginatedResponse<ServiceOfferPublic>> {
    let params = new HttpParams();
    if (filter.locationId) params = params.set('locationId', filter.locationId);
    if (filter.offerType)  params = params.set('offerType',  filter.offerType);
    if (filter.status)     params = params.set('status',     filter.status);
    if (filter.from)       params = params.set('from',       filter.from);
    if (filter.to)         params = params.set('to',         filter.to);
    if (filter.page)       params = params.set('page',       filter.page.toString());
    if (filter.limit)      params = params.set('limit',      filter.limit.toString());

    return this.http
      .get<ApiResponse<PaginatedResponse<ServiceOfferPublic>>>(
        `${this.base}/services/offers`,
        { params }
      )
      .pipe(map((r: any) => r.data));
  }

  getOffer(id: string): Observable<ServiceOfferPublic> {
    return this.http
      .get<ApiResponse<{ offer: ServiceOfferPublic }>>(`${this.base}/services/offers/${id}`)
      .pipe(map((r: any) => r.data.offer));
  }

  createOffer(payload: CreateServiceOfferPayload): Observable<ServiceOfferPublic> {
    return this.http
      .post<ApiResponse<{ offer: ServiceOfferPublic }>>(`${this.base}/services/offers`, payload)
      .pipe(map((r: any) => r.data.offer));
  }

  updateOffer(id: string, payload: UpdateServiceOfferPayload): Observable<ServiceOfferPublic> {
    return this.http
      .patch<ApiResponse<{ offer: ServiceOfferPublic }>>(
        `${this.base}/services/offers/${id}`,
        payload
      )
      .pipe(map((r: any) => r.data.offer));
  }

  deleteOffer(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.base}/services/offers/${id}`)
      .pipe(map(() => undefined));
  }

  // ─── BOOKING REQUESTS ──────────────────────────────────────

  getOfferRequests(offerId: string): Observable<BookingRequestPublic[]> {
    return this.http
      .get<ApiResponse<{ requests: BookingRequestPublic[] }>>(
        `${this.base}/services/offers/${offerId}/requests`
      )
      .pipe(map((r: any) => r.data.requests));
  }

  myRequests(): Observable<BookingRequestPublic[]> {
    return this.http
      .get<ApiResponse<{ requests: BookingRequestPublic[] }>>(
        `${this.base}/services/my-requests`
      )
      .pipe(map((r: any) => r.data.requests));
  }

  requestBooking(offerId: string): Observable<BookingRequestPublic> {
    return this.http
      .post<ApiResponse<{ request: BookingRequestPublic }>>(
        `${this.base}/services/requests`,
        { offerId }
      )
      .pipe(map((r: any) => r.data.request));
  }

  resolveRequest(
    id: string,
    payload: ResolveBookingRequestPayload
  ): Observable<BookingRequestPublic> {
    return this.http
      .patch<ApiResponse<{ request: BookingRequestPublic }>>(
        `${this.base}/services/requests/${id}/resolve`,
        payload
      )
      .pipe(map((r: any) => r.data.request));
  }
}
