export interface NebenkostenEntry {
  id: string; // Client-side ID for list rendering
  amount: string;
  date: string;
}

export type KautionStatus = 'Erhalten' | 'Ausstehend' | 'Zurückgezahlt';

export interface KautionData {
  amount: number;           // Deposit amount in EUR
  paymentDate: string;      // ISO date string (YYYY-MM-DD)
  status: KautionStatus;
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
}

export interface KautionFormData {
  amount: string;           // String for form input handling
  paymentDate: string;      // ISO date string (YYYY-MM-DD)
  status: KautionStatus;
}

export interface Tenant {
  id: string;
  wohnung_id?: string;
  name: string;
  einzug?: string;
  auszug?: string;
  email?: string;
  telefonnummer?: string;
  notiz?: string;
  nebenkosten?: NebenkostenEntry[];
  kaution?: KautionData;    // New optional kaution field
  status?: TenantStatus;
}

export type TenantStatus = 'bewerber' | 'mieter';
