import type { JSONContent } from '@tiptap/react';
import { loeseVariable, type VorlagenKontext } from './variablen';
import { bedingungErfuellt, BEDINGUNG_NODE_NAME, type BedingungAttrs } from './bedingungen';

/**
 * Wandelt eine Vorlage (TipTap-JSON) in Klartext um, z. B. für den mailto-Versand.
 *
 * - Absätze und Überschriften sind durch eine Leerzeile getrennt.
 * - hardBreak wird zum Zeilenumbruch.
 * - Aufzählungen: "- " je Punkt, nummerierte Listen "1. ", "2. " ...
 * - Variablen (mention) werden über loeseVariable aufgelöst, sonst als "[Label]" ausgegeben.
 * - Bedingungsblöcke werden nur ausgegeben, wenn die Bedingung erfüllt ist.
 */
export function vorlageZuText(doc: JSONContent, kontext: VorlagenKontext): string {
  return blocksZuText(doc.content ?? [], kontext).join('\n\n');
}

function inlineZuText(nodes: JSONContent[] | undefined, kontext: VorlagenKontext): string {
  if (!nodes) return '';

  return nodes
    .map((node) => {
      if (node.type === 'text') return node.text ?? '';
      if (node.type === 'hardBreak') return '\n';
      if (node.type === 'mention') {
        const id = String(node.attrs?.id ?? '');
        const label = String(node.attrs?.label || node.attrs?.id || 'Variable');
        return loeseVariable(id, kontext) ?? `[${label}]`;
      }
      return inlineZuText(node.content, kontext);
    })
    .join('');
}

/** Alle nicht leeren Blöcke einer Liste von Knoten als Text. */
function blocksZuText(nodes: JSONContent[], kontext: VorlagenKontext): string[] {
  const ergebnis: string[] = [];

  for (const node of nodes) {
    const text = blockZuText(node, kontext).trim();
    if (text.length > 0) ergebnis.push(text);
  }

  return ergebnis;
}

function blockZuText(node: JSONContent, kontext: VorlagenKontext): string {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
      return inlineZuText(node.content, kontext);

    case 'bulletList':
      return listenZuText(node, kontext, () => '- ');

    case 'orderedList': {
      const start = typeof node.attrs?.start === 'number' ? node.attrs.start : 1;
      return listenZuText(node, kontext, (index) => `${start + index}. `);
    }

    case BEDINGUNG_NODE_NAME: {
      const attrs = (node.attrs ?? {}) as BedingungAttrs;
      const wert = loeseVariable(String(attrs.variable ?? '').trim(), kontext);
      if (!bedingungErfuellt(attrs, wert)) return '';
      return blocksZuText(node.content ?? [], kontext).join('\n\n');
    }

    case 'horizontalRule':
      return '';

    case 'text':
    case 'mention':
    case 'hardBreak':
      return inlineZuText([node], kontext);

    default:
      // Unbekannte Container (z. B. blockquote) geben ihren Inhalt als Blöcke aus.
      if (node.content) return blocksZuText(node.content, kontext).join('\n\n');
      return '';
  }
}

function listenZuText(
  liste: JSONContent,
  kontext: VorlagenKontext,
  marke: (index: number) => string
): string {
  const zeilen: string[] = [];

  // Nummern nur fuer ausgegebene Eintraege vergeben (leere Eintraege erzeugen keine Luecke)
  for (const eintrag of liste.content ?? []) {
    const text = listenEintragZuText(eintrag, kontext, marke(zeilen.length));
    if (text.length > 0) zeilen.push(text);
  }

  return zeilen.join('\n');
}

function listenEintragZuText(eintrag: JSONContent, kontext: VorlagenKontext, marke: string): string {
  const inhalt = blocksZuText(eintrag.content ?? [], kontext).join('\n');
  if (inhalt.length === 0) return '';

  const fortsetzung = ' '.repeat(marke.length);
  return inhalt
    .split('\n')
    .map((zeile, index) => (index === 0 ? `${marke}${zeile}` : zeile === '' ? '' : `${fortsetzung}${zeile}`))
    .join('\n');
}
