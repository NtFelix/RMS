export interface Finanzen {
  id: string;
  betrag: string | number;
  ist_einnahmen: boolean;
  datum: string;
  name?: string;
  wohnung_id?: string;
  Wohnungen?: Array<{
    name: string;
  }>;
}
