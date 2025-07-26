import type { Apartment as ApartmentTableType } from "@/components/columns/apartments-columns";

export interface Wohnung extends ApartmentTableType {
  status: 'frei' | 'vermietet';
  tenant?: {
    id: string;
    name: string;
    einzug: string;
    auszug: string;
  };
  Haeuser: {
    name: string;
  } | null;
}
