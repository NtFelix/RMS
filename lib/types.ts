// Types for data fetching - can be imported by both client and server components
import { NebenkostenEntry } from "../types/Tenant";

export type Wohnung = {
    id: string;
    groesse: number;
    name: string;
    miete: number;
    user_id: string;
    haus_id: string | null;
};

export type Haus = {
    id: string;
    ort: string | null;
    name: string;
    user_id: string;
    strasse: string | null;
    groesse?: number | null;
};

export type Mieter = {
    id: string;
    wohnung_id: string | null;
    name: string;
    einzug: string | null;
    auszug: string | null;
    email: string | null;
    telefonnummer: string | null;
    notiz: string | null;
    nebenkosten: NebenkostenEntry[] | null;
    user_id: string;
    Wohnungen?: {
        name: string;
        groesse: number;
    } | null;
};

export type Aufgabe = {
    id: string;
    user_id: string;
    ist_erledigt: boolean;
    name: string;
    beschreibung: string;
    erstellungsdatum: string;
    aenderungsdatum: string;
};

export type HausMitFlaeche = {
    id: string;
    name: string;
    gesamtFlaeche: number;
    anzahlWohnungen: number;
    anzahlMieter: number;
};

export type Nebenkosten = {
    id: string;
    startdatum: string;
    enddatum: string;
    nebenkostenart: string[] | null;
    betrag: number[] | null;
    berechnungsart: string[] | null;
    zaehlerkosten: Record<string, number> | null;
    zaehlerverbrauch: Record<string, number> | null;
    haeuser_id: string;
    user_id: string;
    Haeuser?: { name: string } | null;
    Rechnungen?: RechnungSql[] | null;
    gesamtFlaeche?: number;
    anzahlWohnungen?: number;
    anzahlMieter?: number;
};

export type NebenkostenChartData = {
    year: number;
    data: {
        name: string;
        value: number;
    }[];
};

export type NebenkostenChartDatum = {
    name: string;
    value: number;
};

export interface Rechnung {
    id: string;
    user_id: string;
    nebenkosten_id: string | null;
    mieter_id: string | null;
    name: string;
    betrag: number | null;
}

export type RechnungSql = {
    id: string;
    nebenkosten_id: string;
    mieter_id: string;
    betrag: number;
    name: string;
    user_id: string;
};

// Re-export zaehler types
export type { ZaehlerTyp } from './zaehler-types';
export { ZAEHLER_CONFIG, getZaehlerLabel, getZaehlerEinheit } from './zaehler-types';
import type { ZaehlerTyp } from './zaehler-types';

// Generic meter type
export type Zaehler = {
    id: string;
    custom_id: string | null;
    wohnung_id: string;
    erstellungsdatum: string;
    eichungsdatum: string | null;
    zaehler_typ: ZaehlerTyp;
    einheit: string;
    ist_aktiv?: boolean;
    user_id: string;
};

export type ZaehlerAblesung = {
    id: string;
    zaehler_id: string;
    ablese_datum: string;
    zaehlerstand: number;
    verbrauch: number;
    kommentar?: string | null;
    user_id: string;
};

// Legacy types for backward compatibility
export type WasserZaehler = Zaehler;
export type WasserAblesung = ZaehlerAblesung;

// Legacy Wasserzaehler type (old structure with nebenkosten_id)
// Named explicitly to avoid confusion with WasserZaehler alias
export type LegacyWasserzaehler = {
    id: string;
    nebenkosten_id: string;
    mieter_id: string;
    ablese_datum: string;
    zaehlerstand: number;
    verbrauch: number;
    user_id: string;
};

// Backward compatibility alias
export type Wasserzaehler = LegacyWasserzaehler;

export type WasserzaehlerFormEntry = {
    id: string;
    ablese_datum: string;
    zaehlerstand: number;
    verbrauch?: number;
    kommentar?: string;
};

export type WasserzaehlerFormData = {
    wasserkosten: number;
    entries: WasserzaehlerFormEntry[];
};

export type Finanzen = {
    id: string;
    wohnung_id: string | null;
    name: string;
    datum: string | null;
    betrag: number;
    ist_einnahmen: boolean;
    notiz: string | null;
    user_id: string;
    dokument_id: string | null;
};
