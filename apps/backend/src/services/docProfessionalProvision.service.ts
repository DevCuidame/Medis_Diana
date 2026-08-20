// ============================================================
// Aprovisiona automáticamente, en CuidameDoc, la cuenta correspondiente a un
// profesional recién creado en Medis, enlazada como "trabajador" de la
// cabeza del sitio (docs/superpowers/specs/2026-08-10-doctores-cuidamedoc-provision-design.md).
// Nunca lanza — toda llamada de red vuelve como { ok, error? } para que el
// llamador decida qué hacer sin tumbar la creación local ya exitosa.
// ============================================================

import { env } from '@config/env.js';
import { withDocAuth } from '@utils/docAuth.js';

export interface ProvisionDocProfessionalParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  idType: string;
  idNumber: string;
  phone: string;
  address: string;
  medicalRegistrationNumber: string;
  specialties?: string[];
}

export interface ProvisionDocProfessionalResult {
  ok: boolean;
  docProfessionalId?: number;
  error?: string;
}

export async function provisionDocProfessional(
  params: ProvisionDocProfessionalParams
): Promise<ProvisionDocProfessionalResult> {
  try {
    const body = JSON.stringify({
      email: params.email,
      password: params.password,
      first_name: params.firstName,
      last_name: params.lastName,
      identification_type: params.idType,
      identification_number: params.idNumber,
      phone: params.phone,
      address: params.address,
      medical_license_number: params.medicalRegistrationNumber,
      specialization: params.specialties?.[0],
    });

    const res = await withDocAuth((token) =>
      fetch(`${env.DOC_API_URL}/professionals/team-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body,
        signal: AbortSignal.timeout(8000),
      })
    );

    const json = await res.json() as { success: boolean; data?: { professional_id: number }; message?: string };
    if (!res.ok || !json.success || typeof json.data?.professional_id !== 'number') {
      return { ok: false, error: json.message ?? `CuidameDoc respondió ${res.status}` };
    }
    return { ok: true, docProfessionalId: json.data.professional_id };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}

export interface DeactivateDocProfessionalResult {
  ok: boolean;
  error?: string;
}

/** Desactiva (soft) en CuidameDoc al profesional del equipo con este professional_id. */
export async function deactivateDocProfessional(
  docProfessionalId: number
): Promise<DeactivateDocProfessionalResult> {
  try {
    const res = await withDocAuth((token) =>
      fetch(`${env.DOC_API_URL}/professionals/team-members/${docProfessionalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      })
    );

    const json = await res.json() as { success: boolean; message?: string };
    if (!res.ok || !json.success) {
      return { ok: false, error: json.message ?? `CuidameDoc respondió ${res.status}` };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}
