export interface Wohnung {
  id: string;
  name: string;
  miete: number;
  groesse: number;
  zimmer: number;
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
