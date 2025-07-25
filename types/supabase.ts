// types/supabase.ts
export interface Profile {
  id: string; // Or user_id, depending on your schema
  email?: string;
  // ... other existing profile fields
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null; // Or Date
}

export interface House {
  id: string;
  name: string;
  ort: string;
  strasse: string;
  plz: string;
}

export interface Finanzen {
  id: string;
  datum: string;
  beschreibung: string;
  betrag: number;
  kategorie: string;
  ist_einnahmen: boolean;
  Wohnungen?: { name: string };
}

export interface Betriebskosten {
  id: string;
  jahr: number;
  kostenart: string;
  betrag: number;
  haeuser_id: string;
  Haeuser?: { name: string };
}
