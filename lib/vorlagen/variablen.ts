/**
 * Auflösung der Vorlagen-Variablen (Mention-Nodes im TipTap-JSON) auf konkrete Werte.
 *
 * Die Auflösung erfolgt ausschließlich über die Registry-ID (z. B. "mieter.name"),
 * nicht über das Label. Nicht auflösbare Variablen liefern `null`; der Aufrufer
 * entscheidet dann, wie der Platzhalter dargestellt wird.
 */

export interface VorlagenKontext {
  mieter?: {
    anrede?: string | null;
    vorname?: string | null;
    nachname?: string | null;
    name?: string | null;
    email?: string | null;
    telefonnummer?: string | null;
  } | null;
  vermieter?: { name?: string | null } | null;
  heute?: Date;
}

type MieterKontext = NonNullable<VorlagenKontext['mieter']>;

function trimmen(wert: string | null | undefined): string {
  return typeof wert === 'string' ? wert.trim() : '';
}

/** "Vorname Nachname"; fällt auf das Feld `name` zurück, wenn beide Teile fehlen (Altdaten). */
function anzeigename(mieter: MieterKontext): string {
  const teile = [trimmen(mieter.vorname), trimmen(mieter.nachname)].filter(Boolean);
  if (teile.length > 0) return teile.join(' ');
  return trimmen(mieter.name);
}

/**
 * Vollständige Briefanrede ohne abschließendes Komma.
 * - Frau mit Nachname: "Sehr geehrte Frau <Nachname>"
 * - Herr mit Nachname: "Sehr geehrter Herr <Nachname>"
 * - sonst: "Guten Tag <Anzeigename>" bzw. "Guten Tag", wenn kein Name gepflegt ist.
 * Altdaten (Anrede keine_angabe, ganzer Name im Nachnamen) ergeben "Guten Tag <ganzer Name>".
 */
export function anredeVoll(mieter: VorlagenKontext['mieter']): string {
  if (!mieter) return 'Guten Tag';

  const anrede = trimmen(mieter.anrede).toLowerCase();
  const nachname = trimmen(mieter.nachname);

  if (nachname && anrede === 'frau') return `Sehr geehrte Frau ${nachname}`;
  if (nachname && anrede === 'herr') return `Sehr geehrter Herr ${nachname}`;

  const name = anzeigename(mieter);
  return name ? `Guten Tag ${name}` : 'Guten Tag';
}

function anredeKurz(mieter: MieterKontext): string {
  const anrede = trimmen(mieter.anrede).toLowerCase();
  if (anrede === 'frau') return 'Frau';
  if (anrede === 'herr') return 'Herr';
  // keine_angabe oder nicht gepflegt: leerer Text (bekanntes, aber leeres Feld)
  return '';
}

/**
 * Löst eine Variable anhand ihrer Registry-ID auf.
 * Liefert `null`, wenn die ID unbekannt ist oder es keinen Mieter-/Vermieter-Kontext gibt (Ausgabe dann als [Label]).
 * Ein bekanntes, aber leeres Feld (z. B. keine E-Mail hinterlegt) ergibt einen leeren Text, damit im versendeten
 * Text kein Platzhalter steht; mit einem bedingten Block "ist leer" lässt sich darauf reagieren.
 */
/**
 * Variablen, die loeseVariable beim Versand tatsaechlich aufloest. Bedingungen duerfen nur diese verwenden: eine
 * Bedingung auf eine nie aufgeloeste Variable wuerde ihren Block sonst stillschweigend immer weglassen.
 */
export const AUFLOESBARE_VARIABLEN: ReadonlySet<string> = new Set([
  'mieter.name',
  'mieter.vorname',
  'mieter.nachname',
  'mieter.anrede',
  'mieter.anrede_voll',
  'mieter.email',
  'mieter.telefon',
  'datum.heute',
  'vermieter.name',
]);

export function loeseVariable(id: string, kontext: VorlagenKontext): string | null {
  switch (id) {
    case 'mieter.name': {
      if (!kontext.mieter) return null;
      return anzeigename(kontext.mieter);
    }
    case 'mieter.vorname':
      return kontext.mieter ? trimmen(kontext.mieter.vorname) : null;
    case 'mieter.nachname':
      return kontext.mieter ? trimmen(kontext.mieter.nachname) : null;
    case 'mieter.anrede':
      return kontext.mieter ? anredeKurz(kontext.mieter) : null;
    case 'mieter.anrede_voll':
      return kontext.mieter ? anredeVoll(kontext.mieter) : null;
    case 'mieter.email':
      return kontext.mieter ? trimmen(kontext.mieter.email) : null;
    case 'mieter.telefon':
      return kontext.mieter ? trimmen(kontext.mieter.telefonnummer) : null;
    case 'datum.heute':
      return (kontext.heute ?? new Date()).toLocaleDateString('de-DE');
    case 'vermieter.name':
      return kontext.vermieter ? trimmen(kontext.vermieter.name) : null;
    default:
      return null;
  }
}
