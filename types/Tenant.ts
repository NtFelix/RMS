export interface NebenkostenEntry {
  id: string; // Client-side ID for list rendering
  amount: string;
  date: string;
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
  kaution?: KautionData;
}

export const KAUTION_STATUS = {
  ERHALTEN: 'Erhalten',
  AUSSTEHEND: 'Ausstehend',
  ZURUECKGEZAHLT: 'Zurückgezahlt',
} as const;

export type KautionStatus =
  (typeof KAUTION_STATUS)[keyof typeof KAUTION_STATUS];

export const kautionStatusOptions: { label: string; value: KautionStatus }[] = [
  { label: 'Erhalten', value: KAUTION_STATUS.ERHALTEN },
  { label: 'Ausstehend', value: KAUTION_STATUS.AUSSTEHEND },
  { label: 'Zurückgezahlt', value: KAUTION_STATUS.ZURUECKGEZAHLT },
];

export interface KautionData {
  amount: number;
  paymentDate: string;
  status: KautionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface KautionFormData {
  amount: string;
  paymentDate: string;
  status: KautionStatus;
}
