import type { KautionKompat } from './Kaution';
import type { Anrede, Person } from '../lib/personen';

export interface NebenkostenEntry {
  id: string; // Client-side ID for list rendering
  amount: string;
  date: string;
}

export interface Tenant {
  id: string;
  wohnung_id?: string;
  /** Verknüpfte Person (Tabelle "Personen", GH-30). */
  person_id?: string;
  /** Eingebettete Person (Select-Schlüssel `person`), falls geladen. */
  person?: Person | null;
  /** Anzeigename "Vorname Nachname", abgeleitet aus der Person (bisheriges Feld). */
  name: string;
  anrede?: Anrede;
  vorname?: string | null;
  nachname?: string | null;
  einzug?: string;
  auszug?: string;
  /** Abgeleitet aus der Person (bisheriges Feld). */
  email?: string;
  /** Abgeleitet aus der Person (bisheriges Feld). */
  telefonnummer?: string;
  notiz?: string;
  nebenkosten?: NebenkostenEntry[];
  /**
   * Compat form derived from the deposit tables by the RPC `get_mieter_details_overview`.
   * `null` without module right `kautionen` (or without a deposit). Not writable via the tenant form.
   */
  kaution?: KautionKompat | null;
  /**
   * UI-Feld: 'bewerber' für Einträge aus der Tabelle "Bewerber", sonst 'mieter'.
   * Die Datenbank kennt kein Status-Feld mehr an "Mieter" (GH-30).
   */
  status?: TenantStatus;
  /** Status des Bewerbers aus der Tabelle "Bewerber" (nur bei Bewerbern). */
  bewerber_status?: BewerberStatus;

  // AI Applicant Scoring Fields (Bewerber, Tabelle "Bewerber")
  bewerbung_score?: number;
  bewerbung_mail_id?: string;
  bewerbung_metadaten?: Record<string, any>; // JSONB data
}

export type TenantStatus = 'bewerber' | 'mieter';

export type BewerberStatus = 'neu' | 'in_pruefung' | 'abgesagt' | 'angenommen';
