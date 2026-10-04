import type { KautionKompat } from './Kaution';

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
