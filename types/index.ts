// This file is for general application type definitions.

export type Finanz = {
  id: string;
  wohnung_id: string | null;
  name: string;
  datum: string | null;
  betrag: number;
  ist_einnahmen: boolean;
  notiz: string | null;
  user_id: string;
  Wohnungen?: { name: string };
};

export type Totals = {
  income: number;
  expense: number;
  balance: number;
};

export type Wohnung = {
  id: string;
  name: string;
};
