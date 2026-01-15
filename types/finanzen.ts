/**
 * Payload for creating new finance entries via the API.
 * Used by both the client (use-tenant-payments hook) and the server (finance-entries API route).
 */
export interface FinanceEntryPayload {
  wohnung_id: string;
  name: string;
  betrag: number;
  datum: string;
  ist_einnahmen?: boolean;
  notiz?: string;
  tags?: string[];
}

export interface Finanzen {
  id: string;
  betrag: number;
  ist_einnahmen: boolean;
  datum: string;
  name?: string;
  wohnung_id?: string;
  dokument_id?: string | null;
  Wohnungen?: {
    name: string;
  } | null;
  Dokumente_Metadaten?: {
    id: string;
    dateipfad: string;
    dateiname: string;
    dateigroesse?: number | null;
    mime_type?: string | null;
  } | null;
}
