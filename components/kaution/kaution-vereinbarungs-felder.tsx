"use client";

/**
 * Agreement fields of a deposit form ("Kautionsmanagement", GH-6, phase 3), shared by the creation form and the
 * agreement form: bank account fields for the account types (IBAN, bank, account holder, separate account),
 * guarantor/insurer and document number for guarantee and insurance, and the interest method when the interest
 * function is on and the type has an account.
 *
 * Pure presentation: the values live in the calling form, the rules are in `lib/kautionen-vereinbarung.ts`.
 * The IBAN keeps the text as typed while editing and is grouped when the field is left. Its check is only a
 * live hint here; the submit and the database decide.
 */

import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KautionFeld } from "@/components/kaution/kaution-feld";
import {
  formatiereIban,
  GETRENNT_HINWEIS_TEXT,
  GETRENNT_WAHL_LABELS,
  getrenntHinweisNoetig,
  istIbanEingabeUngueltig,
  type GetrenntWahl,
  type KautionVereinbarungsFehler,
  type KautionVereinbarungsWerte,
} from "@/lib/kautionen-vereinbarung";
import { KAUTION_TEXT_LIMITS, KAUTION_ZINSMETHODEN, KAUTION_ZINSMETHODE_LABELS, kautionHatKonto } from "@/lib/kautionen-constants";
import type { KautionArt, KautionZinsmethode } from "@/types/Kaution";

interface KautionVereinbarungsFelderProps {
  /** Base ID of the form, the fields derive their IDs from it. */
  basisId: string;
  /** Deposit type: decides which fields are shown. */
  art: KautionArt;
  /** Function flag `zinsen`: the interest method is shown for account types only when it is on. */
  zinsenAktiv: boolean;
  werte: KautionVereinbarungsWerte;
  fehler: KautionVereinbarungsFehler;
  /** Changes some of the values (the calling form merges them). */
  aendere: (aenderung: Partial<KautionVereinbarungsWerte>) => void;
  /** Disables all fields (no right, or a request is running). */
  gesperrt: boolean;
}

const GETRENNT_OPTIONEN: GetrenntWahl[] = ["ja", "nein", "nicht_erfasst"];

export function KautionVereinbarungsFelder({ basisId, art, zinsenAktiv, werte, fehler, aendere, gesperrt }: KautionVereinbarungsFelderProps) {
  const konto = kautionHatKonto(art);
  const zinsmethodeAnzeigen = zinsenAktiv && konto;
  const ibanUngueltig = istIbanEingabeUngueltig(werte.iban);

  return (
    <>
      {konto ? (
        <>
          <KautionFeld
            id={`${basisId}-iban`}
            label="IBAN"
            fehler={fehler.iban}
            hinweis={
              ibanUngueltig
                ? "Diese IBAN ist ungültig. Bitte prüfen Sie die Eingabe."
                : "Mit oder ohne Leerzeichen. Beim Verlassen des Feldes wird die IBAN gruppiert."
            }
          >
            {(props) => (
              <Input
                {...props}
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                disabled={gesperrt}
                maxLength={KAUTION_TEXT_LIMITS.iban.max + 8}
                value={werte.iban}
                onChange={(event) => aendere({ iban: event.target.value })}
                onBlur={() => aendere({ iban: formatiereIban(werte.iban) })}
              />
            )}
          </KautionFeld>

          <KautionFeld id={`${basisId}-bank`} label="Bank" fehler={fehler.bank}>
            {(props) => (
              <Input
                {...props}
                type="text"
                autoComplete="off"
                maxLength={KAUTION_TEXT_LIMITS.bank.max}
                value={werte.bank}
                onChange={(event) => aendere({ bank: event.target.value })}
              />
            )}
          </KautionFeld>

          <KautionFeld id={`${basisId}-kontoinhaber`} label="Kontoinhaber" fehler={fehler.kontoinhaber}>
            {(props) => (
              <Input
                {...props}
                type="text"
                autoComplete="off"
                maxLength={KAUTION_TEXT_LIMITS.kontoinhaber.max}
                value={werte.kontoinhaber}
                onChange={(event) => aendere({ kontoinhaber: event.target.value })}
              />
            )}
          </KautionFeld>

          <KautionFeld id={`${basisId}-getrennt`} label="Getrennt vom eigenen Vermögen angelegt" fehler={fehler.getrennt}>
            {(props) => (
              <Select value={werte.getrennt} onValueChange={(wert) => aendere({ getrennt: wert as GetrenntWahl })} disabled={gesperrt}>
                <SelectTrigger {...props}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GETRENNT_OPTIONEN.map((option) => (
                    <SelectItem key={option} value={option}>
                      {GETRENNT_WAHL_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </KautionFeld>

          {getrenntHinweisNoetig(art, werte.getrennt) ? (
            <Alert role="note" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600">
              <Info aria-hidden="true" className="h-4 w-4" />
              <AlertDescription>{GETRENNT_HINWEIS_TEXT}</AlertDescription>
            </Alert>
          ) : null}
        </>
      ) : (
        <>
          <KautionFeld id={`${basisId}-buerge`} label="Bürge / Versicherer" fehler={fehler.buergeVersicherer}>
            {(props) => (
              <Input
                {...props}
                type="text"
                autoComplete="off"
                maxLength={KAUTION_TEXT_LIMITS.buergeVersicherer.max}
                value={werte.buergeVersicherer}
                onChange={(event) => aendere({ buergeVersicherer: event.target.value })}
              />
            )}
          </KautionFeld>

          <KautionFeld id={`${basisId}-urkunde`} label="Urkunden-/Policennummer" fehler={fehler.urkundennummer}>
            {(props) => (
              <Input
                {...props}
                type="text"
                autoComplete="off"
                maxLength={KAUTION_TEXT_LIMITS.urkundennummer.max}
                value={werte.urkundennummer}
                onChange={(event) => aendere({ urkundennummer: event.target.value })}
              />
            )}
          </KautionFeld>
        </>
      )}

      {zinsmethodeAnzeigen ? (
        <KautionFeld id={`${basisId}-zinsmethode`} label="Zinsmethode" fehler={fehler.zinsmethode}>
          {(props) => (
            <Select
              value={werte.zinsmethode}
              onValueChange={(wert) => aendere({ zinsmethode: wert as KautionZinsmethode })}
              disabled={gesperrt}
            >
              <SelectTrigger {...props}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KAUTION_ZINSMETHODEN.map((option) => (
                  <SelectItem key={option} value={option}>
                    {KAUTION_ZINSMETHODE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </KautionFeld>
      ) : null}
    </>
  );
}
