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
