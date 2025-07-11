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
}
