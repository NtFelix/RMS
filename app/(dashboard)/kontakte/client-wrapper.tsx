"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useKontakteFlagStatus } from "@/hooks/use-kontakte-flag";
import { ROUTES } from "@/lib/constants";
import { ANREDE_OPTIONEN, type Anrede } from "@/lib/personen";
import {
  aktualisiereKontaktAction,
  anlegeKontaktAction,
  loescheKontaktAction,
  type KontaktZeile,
} from "@/app/kontakte-actions";

interface KontakteClientViewProps {
  initialKontakte: KontaktZeile[];
  ladeFehler: string | null;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface FormWerte {
  anrede: Anrede;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  strasse: string;
  plz: string;
  ort: string;
}

const LEERE_WERTE: FormWerte = {
  anrede: "keine_angabe",
  vorname: "",
  nachname: "",
  email: "",
  telefon: "",
  strasse: "",
  plz: "",
  ort: "",
};

function werteAusZeile(zeile: KontaktZeile): FormWerte {
  return {
    anrede: zeile.anrede,
    vorname: zeile.vorname ?? "",
    nachname: zeile.nachname ?? "",
    email: zeile.email ?? "",
    telefon: zeile.telefon ?? "",
    strasse: zeile.strasse ?? "",
    plz: zeile.plz ?? "",
    ort: zeile.ort ?? "",
  };
}

const FEHLER_KLASSE = "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";

export default function KontakteClientView({
  initialKontakte,
  ladeFehler,
  canCreate,
  canEdit,
  canDelete,
}: KontakteClientViewProps) {
  const router = useRouter();
  const flagStatus = useKontakteFlagStatus();

  const [suche, setSuche] = useState("");
  // `null` = geschlossen; "neu" = Anlegen; sonst die Person, die bearbeitet wird.
  const [dialog, setDialog] = useState<{ modus: "neu" } | { modus: "bearbeiten"; zeile: KontaktZeile } | null>(null);
  const [form, setForm] = useState<FormWerte>(LEERE_WERTE);
  const [formFehler, setFormFehler] = useState<string | null>(null);
  const [wirdGespeichert, setWirdGespeichert] = useState(false);
  const [zumLoeschen, setZumLoeschen] = useState<KontaktZeile | null>(null);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    if (!q) return initialKontakte;
    return initialKontakte.filter((kontakt) =>
      [kontakt.anzeigename, kontakt.email, kontakt.telefon, kontakt.ort]
        .some((wert) => (wert ?? "").toLowerCase().includes(q))
    );
  }, [initialKontakte, suche]);

  // Vor dem Laden des Flags nichts anzeigen, damit kein Hinweis kurz aufblitzt.
  if (flagStatus === undefined) {
    return <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">Kontakte wird geladen …</div>;
  }
  if (flagStatus === false) {
    return (
      <div className="flex flex-col gap-3 p-4 md:p-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Kontakte</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Dieser Bereich ist für Ihr Konto noch nicht verfügbar.
        </p>
        <div>
          <Button asChild variant="outline">
            <Link href={ROUTES.HOME}>Zurück zum Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const oeffneNeu = () => {
    setForm(LEERE_WERTE);
    setFormFehler(null);
    setDialog({ modus: "neu" });
  };

  const oeffneBearbeiten = (zeile: KontaktZeile) => {
    setForm(werteAusZeile(zeile));
    setFormFehler(null);
    setDialog({ modus: "bearbeiten", zeile });
  };

  const schliesseDialog = () => {
    if (wirdGespeichert) return;
    setDialog(null);
  };

  const speichern = async () => {
    if (!dialog) return;
    setFormFehler(null);
    setWirdGespeichert(true);
    try {
      const ergebnis =
        dialog.modus === "bearbeiten"
          ? await aktualisiereKontaktAction(dialog.zeile.id, form)
          : await anlegeKontaktAction(form);
      if (!ergebnis.success) {
        setFormFehler(ergebnis.error);
        return;
      }
      toast({ title: dialog.modus === "bearbeiten" ? "Änderungen gespeichert" : "Person angelegt" });
      setDialog(null);
      router.refresh();
    } catch {
      setFormFehler("Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.");
    } finally {
      setWirdGespeichert(false);
    }
  };

  const loeschenBestaetigen = async () => {
    const zeile = zumLoeschen;
    if (!zeile) return;
    setZumLoeschen(null);
    try {
      const ergebnis = await loescheKontaktAction(zeile.id);
      if (!ergebnis.success) {
        toast({ variant: "destructive", title: "Person nicht gelöscht", description: ergebnis.error });
        return;
      }
      toast({ title: "Person in den Papierkorb verschoben" });
      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: "Person nicht gelöscht",
        description: "Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.",
      });
    }
  };

  const setFeld = (feld: keyof FormWerte) => (wert: string) => setForm((vorher) => ({ ...vorher, [feld]: wert }));

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Kontakte</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Alle Personen der Organisation, unabhängig von Mietverhältnis oder Bewerbung.
          </p>
        </div>
        {canCreate && (
          <Button onClick={oeffneNeu}>
            <Plus className="size-4" aria-hidden="true" />
            Person anlegen
          </Button>
        )}
      </div>

      {ladeFehler && <div role="alert" className={FEHLER_KLASSE}>{ladeFehler}</div>}

      <Input
        type="search"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        placeholder="Name, E-Mail, Telefon oder Ort suchen"
        aria-label="Kontakte durchsuchen"
      />

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Anrede</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Ort</TableHead>
              <TableHead>Rollen</TableHead>
              {(canEdit || canDelete) && <TableHead className="text-right">Aktionen</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {gefiltert.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit || canDelete ? 7 : 6} className="text-center text-zinc-500 dark:text-zinc-400">
                  {initialKontakte.length === 0 ? "Noch keine Personen angelegt." : "Keine Personen gefunden."}
                </TableCell>
              </TableRow>
            )}
            {gefiltert.map((kontakt) => (
              <TableRow key={kontakt.id}>
                <TableCell className="font-medium">{kontakt.anzeigename || "—"}</TableCell>
                <TableCell>{ANREDE_OPTIONEN.find((o) => o.value === kontakt.anrede)?.label ?? "—"}</TableCell>
                <TableCell>{kontakt.email || "—"}</TableCell>
                <TableCell>{kontakt.telefon || "—"}</TableCell>
                <TableCell>{kontakt.ort || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {kontakt.istMieter && <Badge variant="secondary">Mieter</Badge>}
                    {kontakt.istBewerber && <Badge variant="outline">Bewerber</Badge>}
                    {!kontakt.istMieter && !kontakt.istBewerber && <span className="text-zinc-400">—</span>}
                  </div>
                </TableCell>
                {(canEdit || canDelete) && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canEdit && (
                        <Button variant="ghost" size="icon" aria-label="Person bearbeiten" onClick={() => oeffneBearbeiten(kontakt)}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" aria-label="Person löschen" onClick={() => setZumLoeschen(kontakt)}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(offen) => !offen && schliesseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.modus === "bearbeiten" ? "Person bearbeiten" : "Person anlegen"}</DialogTitle>
            <DialogDescription>
              Stammdaten der Person. Mindestens Vor- oder Nachname ist erforderlich.
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void speichern();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kontakt-anrede">Anrede</Label>
              <Select value={form.anrede} onValueChange={(wert) => setForm((v) => ({ ...v, anrede: wert as Anrede }))}>
                <SelectTrigger id="kontakt-anrede">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANREDE_OPTIONEN.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="kontakt-vorname">Vorname</Label>
                <Input id="kontakt-vorname" value={form.vorname} onChange={(e) => setFeld("vorname")(e.target.value)} autoComplete="off" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="kontakt-nachname">Nachname</Label>
                <Input id="kontakt-nachname" value={form.nachname} onChange={(e) => setFeld("nachname")(e.target.value)} autoComplete="off" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kontakt-email">E-Mail</Label>
              <Input id="kontakt-email" type="email" value={form.email} onChange={(e) => setFeld("email")(e.target.value)} autoComplete="off" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kontakt-telefon">Telefon</Label>
              <Input id="kontakt-telefon" type="tel" value={form.telefon} onChange={(e) => setFeld("telefon")(e.target.value)} autoComplete="off" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kontakt-strasse">Straße</Label>
              <Input id="kontakt-strasse" value={form.strasse} onChange={(e) => setFeld("strasse")(e.target.value)} autoComplete="off" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="kontakt-plz">PLZ</Label>
                <Input id="kontakt-plz" value={form.plz} onChange={(e) => setFeld("plz")(e.target.value)} autoComplete="off" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="kontakt-ort">Ort</Label>
                <Input id="kontakt-ort" value={form.ort} onChange={(e) => setFeld("ort")(e.target.value)} autoComplete="off" />
              </div>
            </div>

            {formFehler && <div role="alert" className={FEHLER_KLASSE}>{formFehler}</div>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={schliesseDialog} disabled={wirdGespeichert}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={wirdGespeichert}>
                {wirdGespeichert ? "Wird gespeichert …" : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={zumLoeschen !== null} onOpenChange={(offen) => !offen && setZumLoeschen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Person löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Person wird in den Papierkorb verschoben. Ist sie noch als Mieter oder Bewerber aktiv, ist das nicht möglich.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => void loeschenBestaetigen()}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
