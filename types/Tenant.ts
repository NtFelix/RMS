export interface NebenkostenEntry {
  id: string; // Client-side ID for list rendering
  amount: string;
  date: string;
}

export interface KautionData {
  amount: number; // Deposit amount in EUR
  paymentDate: string; // ISO date string (YYYY-MM-DD)
  status: 'Erhalten' | 'Ausstehend' | 'Zurückgezahlt';
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
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
  kaution?: KautionData; // New field
}
