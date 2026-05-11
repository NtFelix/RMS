// Types for data fetching - can be imported by both client and server components
import { NebenkostenEntry } from "../types/Tenant";
import type { LucideIcon } from "lucide-react";

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
    vorauszahlungs_art?: 'soll' | 'ist'; // 'soll' (default) or 'ist' (actual payments)
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
    kommentar?: string | null;
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

/**
 * Deprecated alias kept for compatibility with older Wasserzähler modal code.
 * It now represents readings from Zaehler_Ablesungen plus optional tenant/billing context.
 */
export type Wasserzaehler = ZaehlerAblesung & {
    mieter_id?: string;
    nebenkosten_id?: string | null;
};

export type MeterReadingFormEntry = {
    id: string; // Used as key
    mieter_id: string;
    zaehler_id?: string;
    mieter_name?: string; // Optional for display
    ablese_datum: string | null;
    zaehlerstand: number;
    verbrauch?: number;
    kommentar?: string;
};

export type MeterReadingFormData = {
    nebenkosten_id?: string; // Optional to match data-fetching
    entries: MeterReadingFormEntry[];
};

// Deprecated aliases
export type WasserzaehlerFormEntry = MeterReadingFormEntry;
export type WasserzaehlerFormData = MeterReadingFormData;

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
    tags?: string[] | null;
};

export interface ExternalLinkProps {
    target?: "_blank" | "_self" | "_parent" | "_top";
    rel?: string;
}

export interface NavItem extends ExternalLinkProps {
    name: string;
    href: string;
    icon: LucideIcon;
    description: string;
}

export interface FooterLink extends ExternalLinkProps {
    href: string;
    text: string;
}
