export type ExternalQuoteStatus = 'pending' | 'confirmed' | 'rejected';

export interface ExternalQuoteItem {
  type: 'inventory' | 'plan';
  refId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ExternalQuoteRecord {
  id: string;
  source: string;
  external_reference: string | null;
  patient_name: string;
  patient_email: string | null;
  professional_name: string | null;
  items: ExternalQuoteItem[];
  total_amount: number;
  status: ExternalQuoteStatus;
  resolved_by: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ExternalQuotePublic {
  id: string;
  source: string;
  externalReference: string | null;
  patientName: string;
  patientEmail: string | null;
  professionalName: string | null;
  items: ExternalQuoteItem[];
  totalAmount: number;
  status: ExternalQuoteStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface CreateExternalQuoteDto {
  source?: string;
  externalReference?: string;
  patientName: string;
  patientEmail?: string;
  professionalName?: string;
  items: ExternalQuoteItem[];
  totalAmount: number;
}
