export interface Apartment {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  haus_id?: string;
  Haeuser?: { name: string } | null;
  status: "frei" | "vermietet";
  tenant?: {
    id: string;
    name: string;
    einzug?: string;
    auszug?: string;
  } | null;
}

export interface Wohnung extends Apartment {}
