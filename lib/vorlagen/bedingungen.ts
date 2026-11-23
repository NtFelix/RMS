import type { JSONContent } from '@tiptap/core';

/**
 * Bedingte Blöcke in Vorlagen (TipTap-Node `bedingung`). Der Block wird beim Rendern nur ausgegeben, wenn die
 * Bedingung auf die aufgelöste Variable zutrifft. Reine Logik ohne React, damit Editor, Vorschau und Versand
 * dieselbe Auswertung nutzen.
 */

export type BedingungOperator = 'ausgefuellt' | 'leer' | 'gleich' | 'ungleich';

export interface BedingungAttrs {
  variable: string;
  operator: BedingungOperator;
  wert?: string | null;
}

export const BEDINGUNG_NODE_NAME = 'bedingung';

export const BEDINGUNG_OPERATOREN: readonly BedingungOperator[] = ['ausgefuellt', 'leer', 'gleich', 'ungleich'];

/** Deutsche Bezeichnungen der Operatoren, für Auswahlfelder und die Textvorschau. */
export const BEDINGUNG_OPERATOR_LABELS: Record<BedingungOperator, string> = {
  ausgefuellt: 'ist ausgefüllt',
  leer: 'ist leer',
  gleich: 'ist gleich',
  ungleich: 'ist ungleich',
};

/** Operatoren, die einen Vergleichswert brauchen. */
export function bedingungBrauchtWert(operator: BedingungOperator): boolean {
  return operator === 'gleich' || operator === 'ungleich';
}

function normalisiere(text: string): string {
  return text.trim().toLocaleLowerCase('de-DE');
}

/**
 * Wertet eine Bedingung aus. `wert` ist der aufgelöste Text der Variable; `null` bedeutet, dass die Variable
 * nicht aufgelöst werden konnte. Dann gilt die Variable als leer: `gleich` ist falsch, `ungleich` ist wahr.
 * `gleich` und `ungleich` vergleichen getrimmt und ohne Groß-/Kleinschreibung.
 */
export function bedingungErfuellt(attrs: BedingungAttrs, wert: string | null): boolean {
  const istAusgefuellt = wert !== null && wert.trim() !== '';

  switch (attrs.operator) {
    case 'ausgefuellt':
      return istAusgefuellt;
    case 'leer':
      return !istAusgefuellt;
    case 'gleich':
      return wert !== null && normalisiere(wert) === normalisiere(attrs.wert ?? '');
    case 'ungleich':
      return wert === null || normalisiere(wert) !== normalisiere(attrs.wert ?? '');
    default:
      return false;
  }
}

/**
 * Prüft alle Bedingungsblöcke eines Dokuments. Liefert deutsche Fehlermeldungen für unbekannte Variablen,
 * fehlende oder ungültige Operatoren und fehlende Vergleichswerte bei gleich/ungleich.
 */
export function pruefeBedingungen(doc: JSONContent, gueltigeVariablenIds: ReadonlySet<string>): string[] {
  const fehler: string[] = [];

  const pruefe = (node: JSONContent): void => {
    if (node.type === BEDINGUNG_NODE_NAME) {
      const attrs = (node.attrs ?? {}) as Partial<BedingungAttrs>;
      const variable = typeof attrs.variable === 'string' ? attrs.variable.trim() : '';

      if (variable === '') {
        fehler.push('Bedingung: Bitte eine Variable auswählen.');
      } else if (!gueltigeVariablenIds.has(variable)) {
        fehler.push(`Bedingung: Die Variable "${variable}" ist unbekannt.`);
      }

      if (!attrs.operator || !BEDINGUNG_OPERATOREN.includes(attrs.operator)) {
        fehler.push('Bedingung: Bitte einen Operator auswählen.');
      } else if (bedingungBrauchtWert(attrs.operator) && (attrs.wert ?? '').trim() === '') {
        fehler.push('Bedingung: Bitte einen Vergleichswert angeben.');
      }
    }

    node.content?.forEach(pruefe);
  };

  doc.content?.forEach(pruefe);
  return fehler;
}

/**
 * Kurzbeschreibung eines Bedingungsblocks für die Textvorschau, z. B. `[Wenn Mieter.Name ist gleich „Frau“] `.
 * `variablenLabel` ist der Anzeigename der Variable.
 */
export function formatBedingungPraefix(attrs: Partial<BedingungAttrs>, variablenLabel: string): string {
  const operator = attrs.operator && BEDINGUNG_OPERATOREN.includes(attrs.operator) ? attrs.operator : null;
  const operatorText = operator ? BEDINGUNG_OPERATOR_LABELS[operator] : '';
  const wertText = operator && bedingungBrauchtWert(operator) && attrs.wert ? ` „${attrs.wert}“` : '';
  return `[Wenn ${variablenLabel} ${operatorText}${wertText}] `.replace(/\s+\]/, ']');
}
