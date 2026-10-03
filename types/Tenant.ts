import type { KautionKompat } from './Kaution';

export interface NebenkostenEntry {
  id: string; // Client-side ID for list rendering
  amount: string;
  date: string;
}

/**
 * @deprecated Legacy status of the old `Mieter.kaution` JSON field. It only remains as compat shape
 * (the RPC `get_mieter_details_overview` still derives it). New code uses `KautionZustand`
 * from `@/types/Kaution`.
 */
export type KautionStatus = 'Erhalten' | 'Ausstehend' | 'Zurückgezahlt';

/**
 * @deprecated Legacy shape of the old `Mieter.kaution` JSON field. Deposits now live in the tables
 * `Kautionen` and `Kautionen_Bewegungen`; `Tenant.kaution` carries the derived `KautionKompat`.
 */
export interface KautionData {
  amount: number;           // Deposit amount in EUR
  paymentDate: string;      // ISO date string (YYYY-MM-DD)
  status: KautionStatus;
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
}

/**
 * @deprecated Form state of the removed legacy deposit dialog. Will be deleted together with it.
 */
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
  /**
   * Compat form derived from the deposit tables by the RPC `get_mieter_details_overview`.
   * `null` without module right `kautionen` (or without a deposit). Not writable via the tenant form.
   */
  kaution?: KautionKompat | null;
  status?: TenantStatus;

  // AI Applicant Scoring Fields
  bewerbung_score?: number;
  bewerbung_mail_id?: string;
  bewerbung_metadaten?: Record<string, any>; // JSONB data
}

export type TenantStatus = 'bewerber' | 'mieter';
