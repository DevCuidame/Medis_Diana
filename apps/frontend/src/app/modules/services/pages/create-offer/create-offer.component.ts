// ============================================================
// create-offer.component.ts  —  Smart Component
// apps/frontend/src/app/modules/services/pages/create-offer/
// ============================================================

import {
  Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule }                    from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router }                          from '@angular/router';
import { Subject, forkJoin }               from 'rxjs';
import { takeUntil, finalize }             from 'rxjs/operators';

import { ServicesManagementService }       from '../../services/services-management.service';
import type {
  RoomPublic,
  CreateServiceOfferPayload,
  OfferType,
} from '@acaripole/shared-types';

// ─── Interfaces de apoyo ────────────────────────────────────
interface LocationOption { id: string; name: string; }
interface DisciplineOption { id: string; name: string; }
interface ProfessionalOption { id: string; firstName: string; lastName: string; }

@Component({
  selector: 'app-create-offer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-offer.component.html',
  styleUrls: ['./create-offer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOfferComponent implements OnInit, OnDestroy {
  // ─── DI ──────────────────────────────────────────────────
  private readonly fb      = inject(FormBuilder);
  private readonly svc     = inject(ServicesManagementService);
  private readonly router  = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // ─── Signals de estado ───────────────────────────────────
  readonly isLoading    = signal(false);
  readonly isSaving     = signal(false);
  readonly serverError  = signal<string | null>(null);
  readonly successMsg   = signal<string | null>(null);

  // ─── Catálogos ───────────────────────────────────────────
  readonly locations    = signal<LocationOption[]>([]);
  readonly disciplines  = signal<DisciplineOption[]>([]);
  readonly professionals = signal<ProfessionalOption[]>([]);
  readonly rooms        = signal<RoomPublic[]>([]);

  readonly offerTypes: { value: OfferType; label: string; icon: string }[] = [
    { value: 'class',     label: 'Clase',      icon: '🎯' },
    { value: 'open_pole', label: 'Open Pole',   icon: '🎪' },
    { value: 'workshop',  label: 'Workshop',    icon: '✨' },
    { value: 'event',     label: 'Evento',      icon: '🎉' },
  ];

  // ─── Computed helpers ────────────────────────────────────
  readonly availableRooms = computed(() => this.rooms());
  readonly selectedLocationName = computed(() => {
    const id = this.form?.get('locationId')?.value;
    return this.locations().find((l) => l.id === id)?.name ?? '';
  });

  // ─── Reactive Form ───────────────────────────────────────
  form!: FormGroup;

  ngOnInit(): void {
    this._buildForm();
    this._loadCatalogs();
    this._watchLocationChange();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Getters de control (para el template) ───────────────
  get f(): Record<string, AbstractControl> {
    return this.form.controls;
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && (ctrl.touched || ctrl.dirty));
  }

  getError(field: string, error: string): boolean {
    return !!this.form.get(field)?.hasError(error);
  }

  // ─── Submit ──────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.serverError.set(null);

    const raw = this.form.getRawValue();
    const payload: CreateServiceOfferPayload = {
      locationId:      raw['locationId'],
      roomId:          raw['roomId']          || undefined,
      offerType:       raw['offerType'],
      title:           raw['title'].trim(),
      description:     raw['description']?.trim() || undefined,
      professionalId:  raw['professionalId']  || undefined,
      disciplineId:    raw['disciplineId']    || undefined,
      capacity:        Number(raw['capacity']),
      durationMinutes: Number(raw['durationMinutes']),
      scheduledAt:     new Date(raw['scheduledAt']).toISOString(),
      price:           raw['price'] ? Number(raw['price']) : undefined,
      currency:        'COP',
    };

    this.svc.createOffer(payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (offer) => {
          this.successMsg.set(`✅ Oferta "${offer.title}" creada exitosamente.`);
          this.form.reset({ offerType: 'class', durationMinutes: 60, capacity: 12 });
          setTimeout(() => this.router.navigate(['/admin/services']), 1800);
        },
        error: (err) => {
          this.serverError.set(err.error?.error ?? 'Error inesperado. Inténtalo de nuevo.');
        },
      });
  }

  onCancel(): void {
    this.router.navigate(['/admin/services']);
  }

  // ─── Privados ────────────────────────────────────────────

  private _buildForm(): void {
    this.form = this.fb.group({
      // Sección 1 - Identificación
      offerType:       ['class',    [Validators.required]],
      title:           ['',         [Validators.required, Validators.minLength(4), Validators.maxLength(150)]],
      description:     ['',         [Validators.maxLength(500)]],
      // Sección 2 - Ubicación
      locationId:      ['',         [Validators.required]],
      roomId:          [''],
      // Sección 3 - Instructor y disciplina
      professionalId:  [''],
      disciplineId:    [''],
      // Sección 4 - Horario y capacidad
      scheduledAt:     ['',         [Validators.required]],
      durationMinutes: [60,          [Validators.required, Validators.min(15), Validators.max(240)]],
      capacity:        [12,          [Validators.required, Validators.min(1),  Validators.max(50)]],
      // Sección 5 - Precio
      price:           [null,        [Validators.min(0)]],
    });
  }

  private _loadCatalogs(): void {
    this.isLoading.set(true);

    // Carga disciplinas y profesionales desde los endpoints existentes
    forkJoin({
      disciplines:   this.svc['http'].get<any>(`${this.svc['base']}/classes/options`),
      professionals: this.svc['http'].get<any>(`${this.svc['base']}/professionals`),
      locations:     this.svc['http'].get<any>(`${this.svc['base']}/locations`),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (data) => {
          this.disciplines.set(data['disciplines']?.data?.disciplines ?? []);
          this.professionals.set(data['professionals']?.data?.professionals ?? []);
          this.locations.set(data['locations']?.data?.locations ?? []);
        },
        error: () => this.serverError.set('No se pudieron cargar los catálogos.'),
      });
  }

  private _watchLocationChange(): void {
    this.form.get('locationId')!
      .valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((locationId: string) => {
        this.form.patchValue({ roomId: '' });
        this.rooms.set([]);
        if (!locationId) return;
        this.svc.getRoomsByLocation(locationId)
          .pipe(takeUntil(this.destroy$))
          .subscribe((rooms) => this.rooms.set(rooms));
      });
  }
}
